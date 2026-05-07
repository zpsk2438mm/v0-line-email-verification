import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    console.log("=== 收到請求通知 ===", JSON.stringify(body, null, 2));

    let targetLineId = "";
    let messageContent: any = null;

    // --- 情況 A：來自 Supabase Webhook (當資料庫欄位變動時) ---
    if (body.record) {
      const { record, old_record } = body;
      targetLineId = record.line_user_id || record.lineUserId;

      // 檢查審核狀態是否真的有改變 (從 TRUE 變 FALSE，或 FALSE 變 TRUE)
      if (old_record && String(record.is_approved) !== String(old_record.is_approved)) {
        const isNowApproved = String(record.is_approved) === 'true';
        
        messageContent = createFlex(
          isNowApproved ? "✅ 商品審核通過" : "❌ 商品審核未通過",
          record.name || "未知名商品",
          record.price || 0,
          record.image_url || record.imageUrl,
          isNowApproved ? "#1DB446" : "#E53E3E", // 通過綠色，拒絕紅色
          isNowApproved 
            ? "您的商品已成功上架！買家現在可以在市場上看到了。" 
            : "很抱歉，您的商品未通過審核。請檢查內容或重新提交。"
        );
      } else {
        return NextResponse.json({ message: "狀態未變更，跳過通知" });
      }
    } 
    // --- 情況 B：來自網頁前端直接呼叫 (例如剛上架成功時) ---
    else if (body.lineUserId || body.line_user_id) {
      targetLineId = body.lineUserId || body.line_user_id;
      messageContent = createFlex(
        "📦 商品提交成功",
        body.name || "新商品",
        body.price || 0,
        body.imageUrl || body.image_url,
        "#D95300", // 提交橘色
        "我們已收到您的申請，管理員將盡快為您審核，請耐心等候。"
      );
    }

    if (!targetLineId || !messageContent) {
      return NextResponse.json({ error: "資訊不足或未達發送條件" }, { status: 400 });
    }

    // 發送至 LINE Push API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{ type: 'flex', altText: '商品狀態更新通知', contents: messageContent }]
      }),
    });

    const result = await lineResponse.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Notify API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Flex Message 模板生成器
function createFlex(title: string, name: string, price: any, img: any, color: string, sub: string) {
  let displayUrl = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1000";
  try {
    if (img) {
      const parsed = (typeof img === 'string' && img.startsWith('[')) ? JSON.parse(img) : img;
      displayUrl = Array.isArray(parsed) ? (parsed[0] || displayUrl) : img;
    }
  } catch (e) {}

  return {
    type: 'bubble',
    hero: { type: 'image', url: displayUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
    body: {
      type: 'box', layout: 'vertical', contents: [
        { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md', wrap: true },
        { type: 'box', layout: 'baseline', margin: 'md', contents: [
          { type: 'text', text: '售價', color: '#aaaaaa', size: 'sm', flex: 1 },
          { type: 'text', text: `NT$ ${Number(price).toLocaleString()}`, color: '#D95300', size: 'lg', flex: 4, weight: 'bold' }
        ]},
        { type: 'text', text: sub, color: '#666666', size: 'xs', margin: 'md', wrap: true }
      ]
    }
  };
}
