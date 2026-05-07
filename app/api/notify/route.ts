import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. 取得環境變數
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const ADMIN_ID = process.env.ADMIN_LINE_USER_ID;

  try {
    const body = await req.json();
    console.log("=== 收到請求通知 ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    let targetLineId = "";
    let messageContent: any = null;

    // --- 情況 A：Supabase Webhook (審核狀態變更) ---
    if (body.record && body.old_record) {
      const { record, old_record } = body;
      targetLineId = record.line_user_id;

      if (record.is_approved !== old_record.is_approved) {
        const isNowApproved = record.is_approved === true;
        console.log(`審核更新判斷：${isNowApproved ? "通過" : "未通過"}`);
        
        messageContent = createFlex(
          isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過",
          record.name,
          record.price,
          record.image_url,
          isNowApproved ? "#1DB446" : "#E53E3E",
          isNowApproved ? "您的商品已成功上架！買家現在可以看到它了。" : "很抱歉，您的商品未通過審核。請檢查內容或聯繫管理員。"
        );
      } else {
        return NextResponse.json({ message: "狀態未變更，跳過通知" });
      }
    } 
    
    // --- 情況 B：前端提交 (新商品上架通知用戶) ---
    else if (body.lineUserId) {
      targetLineId = body.lineUserId;
      console.log("處理前端提交通知，目標 ID:", targetLineId);
      
      messageContent = createFlex(
        "📦 商品提交成功",
        body.name,
        body.price,
        body.imageUrl,
        "#D95300",
        "我們已收到您的申請，管理員將盡快為您審核，請耐心等候。"
      );
    }

    // 2. 檢查關鍵參數是否存在
    if (!targetLineId) {
      console.error("錯誤：找不到 lineUserId");
      return NextResponse.json({ error: "缺少 Line User ID" }, { status: 400 });
    }
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("錯誤：環境變數 LINE_CHANNEL_ACCESS_TOKEN 未設定");
      return NextResponse.json({ error: "伺服器 Token 設定錯誤" }, { status: 500 });
    }

    // 3. 發送至 LINE
    console.log("準備發送 LINE 訊息至:", targetLineId);
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{ type: 'flex', altText: '商品狀態更新', contents: messageContent }]
      }),
    });

    const result = await lineResponse.json();
    console.log("LINE API 回傳結果:", JSON.stringify(result));

    if (!lineResponse.ok) {
      throw new Error(`LINE API 錯誤: ${JSON.stringify(result)}`);
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("通知流程發生嚴重錯誤:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 封裝 Flex Message 生成器
function createFlex(title: string, name: string, price: any, img: any, color: string, sub: string) {
  // 處理圖片網址邏輯 (支援字串或陣列)
  let displayUrl = "https://your-domain.com/placeholder.png"; 
  try {
    if (img) {
      const parsed = (typeof img === 'string' && img.startsWith('[')) ? JSON.parse(img) : img;
      displayUrl = Array.isArray(parsed) ? parsed[0] : img;
    }
  } catch (e) {
    displayUrl = img;
  }

  return {
    type: 'bubble',
    hero: { type: 'image', url: displayUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
    body: {
      type: 'box', layout: 'vertical', contents: [
        { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md' },
        { type: 'box', layout: 'baseline', margin: 'md', contents: [
          { type: 'text', text: '售價', color: '#aaaaaa', size: 'sm', flex: 1 },
          { type: 'text', text: `NT$ ${Number(price).toLocaleString()}`, color: '#D95300', size: 'lg', flex: 4, weight: 'bold' }
        ]},
        { type: 'text', text: sub, color: '#666666', size: 'xs', margin: 'md', wrap: true }
      ]
    }
  };
}
