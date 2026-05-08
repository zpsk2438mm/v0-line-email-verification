import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    // 兼容所有可能的欄位名稱，抓到 ID 為止
    const targetId = body.lineUserId || body.line_user_id || body.record?.line_user_id;
    const product = body.record || body;
    
    if (!targetId) return NextResponse.json({ error: "找不到 ID" }, { status: 400 });

    const isApprove = String(product.is_approved) === 'true';
    const title = isApprove ? "✅ 審核通過通知" : "❌ 審核未通過";
    const subText = isApprove ? "您的商品已成功上架！" : "很抱歉，您的商品未通過審核。";

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [{
          type: 'flex',
          altText: '商品審核結果通知',
          contents: {
            type: 'bubble',
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', size: 'lg', color: isApprove ? "#1DB446" : "#E53E3E" },
                { type: 'text', text: product.name || "商品通知", margin: 'md', weight: 'bold' },
                { type: 'text', text: subText, size: 'sm', color: '#666666', margin: 'sm' }
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
