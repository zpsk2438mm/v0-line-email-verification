import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const body = await req.json();
    const { type, record, old_record } = body;
    const data = type === 'DELETE' ? old_record : record;

    if (!data?.line_user_id) return NextResponse.json({ message: "No Line ID" });

    let title = "商品狀態更新";
    let color = "#3B82F6";
    let subText = "";

    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      subText = "管理員審核中，通過後會再通知您。";
    } else if (type === 'UPDATE' && record.is_approved && !old_record.is_approved) {
      title = "✅ 審核通過通知";
      color = "#10B981";
      subText = "您的商品已成功上架！";
    } else if (type === 'DELETE') {
      title = "❌ 審核未通過";
      color = "#EF4444";
      subText = "很抱歉，您的商品未符合規範，已被退回。";
    } else {
      return NextResponse.json({ message: "Ignore update" });
    }

    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: data.line_user_id,
        messages: [{
          type: 'flex', altText: title,
          contents: {
            type: 'bubble',
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', color: color },
                { type: 'text', text: data.name || "商品通知", weight: 'bold', size: 'xl', margin: 'md' },
                { type: 'text', text: subText, color: '#666666', size: 'xs', margin: 'md', wrap: true }
              ]
            }
          }
        }]
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
