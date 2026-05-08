import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    // type 會是 INSERT, UPDATE 或 DELETE
    const type = body.type;
    const record = body.record;
    const oldRecord = body.old_record;

    // 判定要發給誰：如果是刪除，要從 old_record 拿 ID
    const data = type === 'DELETE' ? oldRecord : record;
    const targetId = data?.line_user_id;

    if (!targetId) {
      return NextResponse.json({ message: "No target ID, skip" }, { status: 200 });
    }

    // --- 圖片處理 ---
    let rawImg = data.image_url || data.images || "";
    let cleanPath = typeof rawImg === 'string' ? rawImg.replace(/[\[\]"']/g, '').trim() : "";
    const imageUrl = cleanPath.startsWith('http') ? cleanPath : 
      `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace(/^\//, '')}`;

    // --- 訊息內容判定 ---
    let title = "";
    let color = "";
    let subText = "";

    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6";
      subText = "管理員已收到申請，通過後會再通知您。";
    } else if (type === 'UPDATE') {
      const isNowApproved = String(record.is_approved) === 'true';
      const wasApproved = String(oldRecord?.is_approved) === 'true';
      
      // 只有狀態從「未審核」變成「已審核」才發訊息
      if (isNowApproved && !wasApproved) {
        title = "✅ 審核通過通知";
        color = "#10B981";
        subText = "您的商品已成功上架！";
      } else {
        return NextResponse.json({ message: "Not an approval update" });
      }
    } else if (type === 'DELETE') {
      // 當你在管理後台按「拒絕（刪除）」時
      title = "❌ 審核未通過 (已退回)";
      color = "#EF4444";
      subText = "很抱歉，您的商品未符合刊登規範，已被系統移除。";
    }

    // --- 發送至 LINE ---
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{
          type: 'flex',
          altText: title,
          contents: {
            type: 'bubble',
            hero: { type: 'image', url: imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
                { type: 'text', text: data.name || "商品通知", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
                { type: 'text', text: subText, color: '#666666', size: 'xs', margin: 'md', wrap: true }
              ]
            }
          }
        }]
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
