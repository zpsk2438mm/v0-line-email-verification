import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- 邏輯 A：處理 Supabase 審核通過通知 ---
    // 當你在 Supabase 修改資料時，body 會包含 record (新資料) 與 old_record (舊資料)
    if (body.record && body.old_record) {
      const { record, old_record } = body;

      // 只有當狀態從 false 變為 true 時才執行
      if (record.is_approved === true && old_record.is_approved === false) {
        const userMessage = {
          to: record.line_user_id, // 發送給該商品的刊登者
          messages: [
            {
              type: 'flex',
              altText: `商品審核通過：${record.name}`,
              contents: createFlexBubble("✅ 商品審核通過", record.name, record.price, "您的商品已成功上架！", "#1DB446", record.image_url)
            }
          ]
        };

        await sendToLine(userMessage);
        return NextResponse.json({ success: true, mode: 'user_notification' });
      }
      return NextResponse.json({ message: '狀態未變更' });
    }

    // --- 邏輯 B：處理前端傳來的「新商品待審核」通知 (原本的邏輯) ---
    const { name, price, imageUrl, contact } = body;
    const adminMessage = {
      to: process.env.ADMIN_LINE_USER_ID,
      messages: [
        {
          type: 'flex',
          altText: `新商品上架：${name}`,
          contents: createFlexBubble("📦 新商品待審核", name, price, `聯絡方式：${contact}`, "#D95300", imageUrl)
        }
      ]
    };

    await sendToLine(adminMessage);
    return NextResponse.json({ success: true, mode: 'admin_notification' });

  } catch (error) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 封裝 LINE 發送請求
async function sendToLine(payload: any) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  return res;
}

// 封裝 Flex Message 樣式，讓代碼乾淨一點
function createFlexBubble(title: string, name: string, price: any, subtext: string, titleColor: string, imageUrl: any) {
  return {
    type: 'bubble',
    hero: imageUrl ? {
      type: 'image',
      url: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    } : undefined,
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: title, weight: 'bold', color: titleColor, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md' },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                { type: 'text', text: '售價', color: '#aaaaaa', size: 'sm', flex: 1 },
                { type: 'text', text: `NT$ ${price}`, color: '#666666', size: 'sm', flex: 4 }
              ]
            },
            { type: 'text', text: subtext, color: '#666666', size: 'sm', margin: 'md' }
          ]
        }
      ]
    }
  };
}
