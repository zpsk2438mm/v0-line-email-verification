import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- 情況 A：Supabase Webhook 觸發（審核狀態更新） ---
    if (body.record && body.old_record) {
      const { record, old_record } = body;

      // 只有當 is_approved 狀態有變動時才觸發
      if (record.is_approved !== old_record.is_approved) {
        const isNowApproved = record.is_approved === true;
        
        const statusTitle = isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
        const statusColor = isNowApproved ? "#1DB446" : "#E53E3E"; // 綠色或紅色
        const statusDesc = isNowApproved 
          ? "您的商品已成功上架！買家現在可以看到它了。" 
          : "很抱歉，您的商品未通過審核。請檢查內容後重新上架。";

        await sendToLine(record.line_user_id, createFlex(
          statusTitle, 
          record.name, 
          record.price, 
          record.image_url, 
          statusColor, 
          statusDesc
        ));
        
        return NextResponse.json({ success: true, mode: 'status_update_notified' });
      }
      return NextResponse.json({ message: '狀態無變動' });
    }

    // --- 情況 B：前端提交申請（新商品上架） ---
    // 注意：前端呼叫此 API 時，請務必傳入 lineUserId
    const { name, price, imageUrl, lineUserId } = body;

    if (lineUserId) {
      await sendToLine(lineUserId, createFlex(
        "📦 商品提交成功", 
        name, 
        price, 
        imageUrl, 
        "#D95300", // 橘色
        "我們已收到您的申請，管理員將盡快為您審核。"
      ));
    }
    
    return NextResponse.json({ success: true, mode: 'submission_notified' });

  } catch (error: any) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 統一發送函數
async function sendToLine(to: string, contents: any) {
  return fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: 'flex', altText: '通知', contents }] }),
  });
}

// 統一 Flex 樣式
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
