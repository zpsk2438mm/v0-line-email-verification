import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- 情況 A：來自 Supabase Webhook (審核狀態變更) ---
    if (body.record && body.old_record) {
      const { record, old_record } = body;

      // 只有當審核狀態 (is_approved) 有變動時才觸發
      if (record.is_approved !== old_record.is_approved) {
        const isApproved = record.is_approved === true;
        
        await sendToLine(record.line_user_id, createFlex(
          isApproved ? "✅ 審核通過通知" : "❌ 審核未通過",
          record.name,
          record.price,
          record.image_url,
          isApproved ? "#1DB446" : "#E53E3E", // 通過綠，失敗紅
          isApproved ? "您的商品已成功上架！買家現在可以看到它了。" : "很抱歉，您的商品未通過審核。請檢查內容或聯繫管理員。"
        ));
        return NextResponse.json({ success: true, mode: 'webhook_status_update' });
      }
      return NextResponse.json({ message: '狀態未變更' });
    }

    // --- 情況 B：來自前端表單 (新商品提交) ---
    const { name, price, imageUrl, contact, lineUserId } = body;

    if (lineUserId) {
      await sendToLine(lineUserId, createFlex(
        "📦 商品提交成功",
        name,
        price,
        imageUrl,
        "#D95300", // 南臺橘
        "我們已收到您的申請，管理員將盡快為您審核，請耐心等候通知。"
      ));
    }
    
    return NextResponse.json({ success: true, mode: 'frontend_submission' });

  } catch (error: any) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendToLine(to: string, contents: any) {
  return fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: 'flex', altText: '商品通知', contents }] }),
  });
}

function createFlex(title: string, name: string, price: any, img: any, color: string, sub: string) {
  let displayUrl = "https://your-domain.com/placeholder-logo.png";
  if (img) {
    try {
      const parsed = (typeof img === 'string' && img.startsWith('[')) ? JSON.parse(img) : img;
      displayUrl = Array.isArray(parsed) ? parsed[0] : img;
    } catch { displayUrl = img; }
  }

  return {
    type: 'bubble',
    hero: { type: 'image', url: displayUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
    body: {
      type: 'box', layout: 'vertical', contents: [
        { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md' },
        { type: 'text', text: `NT$ ${Number(price).toLocaleString()}`, weight: 'bold', color: '#D95300', margin: 'sm' },
        { type: 'text', text: sub, color: '#666666', size: 'xs', margin: 'md', wrap: true }
      ]
    }
  };
}
