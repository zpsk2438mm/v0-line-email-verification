import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    const record = body.record || body;
    const oldRecord = body.old_record; // Supabase Webhook 會自動帶入舊資料
    const targetId = record.line_user_id || record.lineUserId;

    if (!targetId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // --- 圖片處理邏輯 ---
    let imageUrl = record.image_url || record.imageUrl || "";
    // 如果圖片網址是 JSON 字串 (Supabase 常用格式)，簡單處理它
    if (imageUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(imageUrl);
        imageUrl = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch (e) {}
    }
    // 確保路徑完整
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${imageUrl.replace(/^\//, '')}`;
    }

    // --- 訊息內容判定 ---
    let title = "";
    let color = "";
    let subText = "";

    if (!oldRecord) {
      // 情況 A：剛刊登 (INSERT)
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6"; // 藍色
      subText = "管理員已收到您的申請，審核通過後會再次通知您。";
    } else {
      // 情況 B：審核結果 (UPDATE)
      const isNowApproved = String(record.is_approved) === 'true';
      const wasApproved = String(oldRecord.is_approved) === 'true';

      if (isNowApproved === wasApproved) return NextResponse.json({ message: "No status change" });

      title = isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
      color = isNowApproved ? "#10B981" : "#EF4444"; // 綠色 或 紅色
      subText = isNowApproved ? "您的商品已成功上架！" : "很抱歉，您的商品未通過審核，請檢查內容。";
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
            hero: { type: 'image', url: imageUrl || "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000", size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
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
