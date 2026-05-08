import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  try {
    const body = await req.json();
    const { type, record, old_record } = body;

    // 1. 決定要讀取的資料來源 (INSERT/UPDATE 用 record，DELETE 用 old_record)
    const activeData = type === 'DELETE' ? old_record : record;
    
    // 如果連資料都沒有，直接結束，不要報錯
    if (!activeData) return NextResponse.json({ message: "No data" });

    const targetId = activeData.line_user_id;
    if (!targetId) return NextResponse.json({ message: "No Line ID" });

    // 2. 圖片處理 (防呆)
    let rawImg = activeData.image_url || activeData.images || "";
    let cleanPath = typeof rawImg === 'string' ? rawImg.replace(/[\[\]"']/g, '').trim() : "";
    const imageUrl = cleanPath.startsWith('http') ? cleanPath : 
      `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace(/^\//, '')}`;

    // 3. 判定標題與顏色
    let title = "商品通知";
    let color = "#3B82F6";
    let subText = "";

    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      color = "#3B82F6";
      subText = "管理員已收到申請，請耐心候審。";
    } else if (type === 'UPDATE') {
      // 檢查是否為「核准」動作
      if (record?.is_approved === true && old_record?.is_approved === false) {
        title = "✅ 審核通過通知";
        color = "#10B981";
        subText = "您的商品已成功上架！";
      } else {
        return NextResponse.json({ message: "Not an approval update" });
      }
    } else if (type === 'DELETE') {
      title = "❌ 審核未通過";
      color = "#EF4444";
      subText = "您的商品未符合規範，已被移除。";
    }

    // 4. 發送 LINE
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
