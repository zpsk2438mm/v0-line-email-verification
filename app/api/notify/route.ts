import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    console.log("=== 收到請求通知 ===", JSON.stringify(body, null, 2));

    // 支援 Supabase Webhook 格式與前端 Fetch 格式
    const record = body.record || body;
    const oldRecord = body.old_record;
    const targetLineId = record.line_user_id || record.lineUserId || body.lineUserId;

    if (!targetLineId) return NextResponse.json({ error: "Missing Line ID" });

    let title = "";
    let color = "";
    let subText = "";

    // --- 核心邏輯：判斷通知類型 ---
    if (!oldRecord) {
      // 沒有舊資料 = 剛上傳商品 (INSERT)
      title = "📦 商品提交成功";
      color = "#D95300"; // 橘色
      subText = "管理員已收到您的申請，將盡快為您審核。";
    } else {
      // 有舊資料 = 審核操作 (UPDATE)
      const isNowApproved = String(record.is_approved) === 'true';
      const wasApproved = String(oldRecord.is_approved) === 'true';

      if (isNowApproved === wasApproved) {
        return NextResponse.json({ message: "狀態未變動，跳過" });
      }

      title = isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
      color = isNowApproved ? "#1DB446" : "#E53E3E";
      subText = isNowApproved ? "您的商品已成功上架！" : "很抱歉，您的商品未通過審核，請檢查內容。";
    }

    // 發送 LINE Flex Message
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{
          type: 'flex', altText: '商品狀態通知',
          contents: {
            type: 'bubble',
            hero: { type: 'image', url: record.image_url || record.imageUrl || "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000", size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
                { type: 'text', text: record.name || "商品名稱", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
                { type: 'box', layout: 'baseline', margin: 'md', contents: [
                  { type: 'text', text: '售價', color: '#aaaaaa', size: 'sm', flex: 1 },
                  { type: 'text', text: `NT$ ${Number(record.price || 0).toLocaleString()}`, color: '#D95300', size: 'lg', flex: 4, weight: 'bold' }
                ]},
                { type: 'text', text: subText, color: '#666666', size: 'xs', margin: 'md', wrap: true }
              ]
            }
          }
        }]
      }),
    });

    const result = await lineResponse.json();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
