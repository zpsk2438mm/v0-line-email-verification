import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    console.log("=== 偵測到請求注入 ===");
    console.log("完整 Payload:", JSON.stringify(body, null, 2));

    // 1. 抓取 LINE ID (多重相容模式)
    const record = body.record || body; 
    const targetLineId = record.line_user_id || record.lineUserId || body.lineUserId;

    if (!targetLineId) {
      console.error("❌ 失敗：找不到任何 Line ID 欄位");
      return NextResponse.json({ error: "找不到 LINE ID" }, { status: 400 });
    }

    // 2. 判斷狀態 (強制轉型判斷)
    const isApproved = String(record.is_approved) === 'true';
    
    // 如果是「前端手動呼叫」或者是「Webhook 狀態改變」，我們就發送
    // 這裡我們放寬限制，只要有請求過來就嘗試發送，確保網頁按鈕一定會響
    const title = isApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
    const color = isApproved ? "#1DB446" : "#E53E3E";
    const subText = isApproved ? "您的商品已成功上架！" : "很抱歉，您的商品未通過審核。";

    console.log(`準備發送通知給 ${targetLineId}，標題為: ${title}`);

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{
          type: 'flex',
          altText: '商品狀態更新',
          contents: createFlex(title, record.name || "商品", record.price || 0, record.image_url || record.imageUrl, color, subText)
        }]
      }),
    });

    const result = await lineResponse.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("嚴重錯誤:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function createFlex(title: string, name: string, price: any, img: any, color: string, sub: string) {
  let displayUrl = img || "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1000";
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
