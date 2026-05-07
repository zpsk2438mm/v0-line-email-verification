import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. 取得環境變數
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    console.log("=== 收到請求通知 ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    let targetLineId = "";
    let messageContent: any = null;

    // --- 情況 A：Supabase Webhook (審核狀態變更) ---
    // 判斷邏輯：檢查是否有 record 欄位 (Supabase Webhook 專屬格式)
    if (body.record) {
      const { record, old_record } = body;
      
      // 優先從 record 裡抓 line_user_id 或 lineUserId
      targetLineId = record.line_user_id || record.lineUserId;

      // 只有在 old_record 存在（代表是 Update）且 狀態真的改變時才發送
      if (old_record && record.is_approved !== old_record.is_approved) {
        const isNowApproved = record.is_approved === true || record.is_approved === 'true';
        console.log(`[Webhook] 審核更新：${isNowApproved ? "通過" : "未通過"}`);
        
        messageContent = createFlex(
          isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過",
          record.name || "未知名商品",
          record.price || 0,
          record.image_url || record.imageUrl,
          isNowApproved ? "#1DB446" : "#E53E3E",
          isNowApproved ? "您的商品已成功上架！買家現在可以看到它了。" : "很抱歉，您的商品未通過審核。請檢查內容或聯繫管理員。"
        );
      } 
      // 如果是新插入資料 (Insert)，也可以選擇是否發送通知
      else if (!old_record) {
        console.log("[Webhook] 偵測到新資料插入");
        // 如果需要新上架也通知，可以在這裡寫邏輯
        return NextResponse.json({ message: "新資料插入，跳過通知" });
      }
      else {
        return NextResponse.json({ message: "狀態未變更，跳過通知" });
      }
    } 
    
    // --- 情況 B：前端直接呼叫 API (例如用戶剛按下提交商品按鈕) ---
    else if (body.lineUserId || body.line_user_id) {
      targetLineId = body.lineUserId || body.line_user_id;
      console.log("[前端] 處理提交通知，目標 ID:", targetLineId);
      
      messageContent = createFlex(
        "📦 商品提交成功",
        body.name || "新商品",
        body.price || 0,
        body.imageUrl || body.image_url,
        "#D95300",
        "我們已收到您的申請，管理員將盡快為您審核，請耐心等候。"
      );
    }

    // 2. 檢查關鍵參數
    if (!targetLineId) {
      console.error("錯誤：找不到任何 lineUserId 欄位");
      return NextResponse.json({ error: "缺少 Line User ID" }, { status: 400 });
    }
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("錯誤：環境變數 LINE_CHANNEL_ACCESS_TOKEN 未設定");
      return NextResponse.json({ error: "伺服器 Token 設定錯誤" }, { status: 500 });
    }
    if (!messageContent) {
      return NextResponse.json({ message: "未達發送條件" });
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
    
    if (!lineResponse.ok) {
      console.error("LINE API 回傳錯誤:", result);
      return NextResponse.json({ error: "LINE API 傳送失敗", detail: result }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("通知流程發生嚴重錯誤:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 封裝 Flex Message 生成器
function createFlex(title: string, name: string, price: any, img: any, color: string, sub: string) {
  let displayUrl = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop"; // 預設圖片
  
  try {
    if (img) {
      // 處理 Supabase 可能傳回的 JSON 字串格式
      const parsed = (typeof img === 'string' && img.startsWith('[')) ? JSON.parse(img) : img;
      displayUrl = Array.isArray(parsed) ? parsed[0] : img;
    }
  } catch (e) {
    displayUrl = img;
  }

  return {
    type: 'bubble',
    hero: { 
      type: 'image', 
      url: displayUrl, 
      size: 'full', 
      aspectRatio: '20:13', 
      aspectMode: 'cover' 
    },
    body: {
      type: 'box', 
      layout: 'vertical', 
      contents: [
        { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md', wrap: true },
        { 
          type: 'box', 
          layout: 'baseline', 
          margin: 'md', 
          contents: [
            { type: 'text', text: '售價', color: '#aaaaaa', size: 'sm', flex: 1 },
            { type: 'text', text: `NT$ ${Number(price).toLocaleString()}`, color: '#D95300', size: 'lg', flex: 4, weight: 'bold' }
          ]
        },
        { type: 'text', text: sub, color: '#666666', size: 'xs', margin: 'md', wrap: true }
      ]
    }
  };
}
