import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    // Supabase Webhook 的標準結構是 body.record
    const record = body.record || body;
    const oldRecord = body.old_record || null;
    const targetId = record.line_user_id || record.lineUserId;

    if (!targetId) return NextResponse.json({ error: "Missing Line ID" }, { status: 400 });

    // --- 🛡️ 圖片路徑抓取強化版 ---
    let imageUrl = "";
    const rawImage = record.image_url || record.images || "";

    if (typeof rawImage === 'string') {
      if (rawImage.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawImage);
          imageUrl = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) { imageUrl = rawImage; }
      } else {
        imageUrl = rawImage;
      }
    } else if (Array.isArray(rawImage)) {
      imageUrl = rawImage[0];
    }

    // 清理網址：去除多餘引號與反斜槓
    let cleanUrl = imageUrl.replace(/[\[\]"']/g, '').trim();

    // 補全 Supabase Storage 網址
    if (cleanUrl && !cleanUrl.startsWith('http')) {
      const path = cleanUrl.replace(/^\//, '');
      // 自動判定路徑，補上你的專案域名
      cleanUrl = path.startsWith('product-images/')
        ? `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${path}`
        : `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${path}`;
    }

    // --- 訊息內容判定 ---
    let title = "";
    let color = "";
    let subText = "";

    if (!oldRecord) {
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6";
      subText = "管理員已收到申請，通過後會再通知。";
    } else {
      const isNowApproved = String(record.is_approved) === 'true';
      const wasApproved = String(oldRecord.is_approved) === 'true';
      if (isNowApproved === wasApproved) return NextResponse.json({ message: "No change" });

      title = isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
      color = isNowApproved ? "#10B981" : "#EF4444";
      subText = isNowApproved ? "您的商品已成功上架！" : "很抱歉，商品未通過審核。";
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
                { type: 'text', text: record.name || "商品名稱", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
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
