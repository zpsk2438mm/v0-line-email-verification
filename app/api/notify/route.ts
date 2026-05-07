import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 從前端傳來的商品資訊
    const { name, price, imageUrl, contact } = await req.json();

    // 這裡定義傳送給 LINE 的內容格式
    const message = {
      to: process.env.ADMIN_LINE_USER_ID, // 發送給誰（你的 User ID）
      messages: [
        {
          type: 'flex',
          altText: `新商品上架：${name}`,
          contents: {
            type: 'bubble',
            hero: imageUrl ? {
              type: 'image',
              url: imageUrl,
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover',
            } : undefined,
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '📦 新商品待審核', weight: 'bold', color: '#1DB446', size: 'sm' },
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
                    {
                      type: 'box',
                      layout: 'baseline',
                      contents: [
                        { type: 'text', text: '聯絡', color: '#aaaaaa', size: 'sm', flex: 1 },
                        { type: 'text', text: contact, color: '#666666', size: 'sm', flex: 4 }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      ]
    };

    // 發送請求給 LINE 的伺服器
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(message),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
