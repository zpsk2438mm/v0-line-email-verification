import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("Missing LINE Token");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const body = await req.json();
    const { type, record, old_record } = body;
    const activeData = type === 'DELETE' ? old_record : record;

    if (!activeData || !activeData.line_user_id) {
      return NextResponse.json({ message: "No actionable data" });
    }

    // 處理圖片路徑
    let rawImg = activeData.image_url || activeData.images || "";
    let cleanPath = typeof rawImg === 'string' ? rawImg.replace(/[\[\]"']/g, '').trim() : "";
    const imageUrl = cleanPath.startsWith('http') ? cleanPath : 
      `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace(/^\//, '')}`;

    let title = "商品通知";
    let color = "#3B82F6";
    let subText = "";

    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6";
      subText = "管理員已收到申請，請耐心候審。";
    } else if (type === 'UPDATE') {
      if (record?.is_approved === true && old_record?.is_approved === false) {
        title = "✅ 審核通過通知";
        color = "#10B981";
        subText = "您的商品已成功上架！";
      } else {
        return NextResponse.json({ message: "Update but not an approval" });
      }
    } else if (type === 'DELETE') {
      title = "❌ 審核未通過";
      color = "#EF4444";
      subText = "您的商品未符合規範，已被系統移除。";
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: activeData.line_user_id,
        messages: [{
          type: 'flex', altText: title,
          contents: {
            type: 'bubble',
            hero: { type: 'image', url: imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' },
            body: {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: title, weight: 'bold', color: color, size: 'sm' },
                { type: 'text', text: activeData.name || "商品通知", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
                { type: 'text', text: subText, color: '#666666', size: 'xs', margin: 'md', wrap: true }
              ]
            }
          }
        }]
      }),
    });

    return NextResponse.json({ success: response.ok });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
