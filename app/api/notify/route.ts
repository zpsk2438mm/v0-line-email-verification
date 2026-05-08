import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    // Supabase Webhook 提供的資料結構
    const record = body.record || body;
    const oldRecord = body.old_record || null;
    const type = body.type; // INSERT, UPDATE, 或 DELETE
    const targetId = (type === 'DELETE' ? oldRecord : record)?.line_user_id;

    if (!targetId) return NextResponse.json({ error: "No Line ID" }, { status: 200 });

    // --- 圖片處理 ---
    const imgPath = (type === 'DELETE' ? oldRecord : record)?.image_url || "";
    let cleanUrl = typeof imgPath === 'string' ? imgPath.replace(/[\[\]"']/g, '').trim() : "";
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      cleanUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace(/^\//, '')}`;
    }

    // --- 判定訊息內容 ---
    let title = "";
    let color = "";
    let subText = "";

    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6";
      subText = "管理員已收到申請，通過後會再通知您。";
    } 
    else if (type === 'UPDATE') {
      const isNowApproved = String(record.is_approved) === 'true';
      const wasApproved = String(oldRecord?.is_approved) === 'true';
      
      if (isNowApproved === wasApproved) return NextResponse.json({ message: "No change" });
      
      if (isNowApproved) {
        title = "✅ 審核通過通知";
        color = "#10B981";
        subText = "您的商品已成功上架！";
      } else {
        title = "❌ 審核未通過";
        color = "#EF4444";
        subText = "您的商品未通過審核，請檢查內容或重新刊登。";
      }
    } 
    else if (type === 'DELETE') {
      // 當管理員按下「拒絕並刪除」時觸發
      title = "❌ 審核未通過 (已退回)";
      color = "#EF4444";
      subText = "很抱歉，您的商品未符合刊登規範，已被移除。";
    }

    // --- 發送 LINE ---
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{
          type: 'flex', altText: title,
          contents: {
            type: 'bubble',
            hero: { 
              type: 'image', 
              url: cleanUrl || "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000", 
              size: 'full', aspectRatio: '20:13', aspectMode: 'cover' 
            },
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
                { type: 'text', text: (type === 'DELETE' ? oldRecord : record).name || "商品通知", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
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
