import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    // 支援多種 payload 格式 (Supabase Webhook vs 手動 Fetch)
    const record = body.record || body;
    const oldRecord = body.old_record || null;
    const targetLineId = record.line_user_id || record.lineUserId || body.lineUserId;

    if (!targetLineId) {
      console.error("❌ 錯誤：找不到 Line ID");
      return NextResponse.json({ error: "Missing Line ID" }, { status: 400 });
    }

    // 邏輯：判斷是「新提交」還是「審核結果」
    let title = "📦 商品狀態更新";
    let color = "#D95300";
    let subText = "您的申請正在處理中";

    const isNowApproved = String(record.is_approved) === 'true';

    if (!oldRecord) {
      // INSERT 模式：剛上架
      title = "📦 商品提交成功";
      subText = "管理員已收到您的申請，請耐心等候審核。";
    } else {
      // UPDATE 模式：審核動作
      const wasApproved = String(oldRecord.is_approved) === 'true';
      if (isNowApproved === wasApproved) return NextResponse.json({ message: "No change" });

      title = isNowApproved ? "✅ 審核通過通知" : "❌ 審核未通過";
      color = isNowApproved ? "#1DB446" : "#E53E3E";
      subText = isNowApproved ? "您的商品已成功上架！" : "很抱歉，您的商品未通過審核。";
    }

    // 發送 LINE
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{
          type: 'flex', altText: title,
          contents: {
            type: 'bubble',
            hero: { type: 'image', url: record.image_url || "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000", size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
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
