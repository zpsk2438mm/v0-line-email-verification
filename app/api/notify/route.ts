import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- 1. 處理 Supabase 自動觸發：審核通過通知 ---
    // 當你在 Supabase 後台修改 is_approved 時，Webhook 會傳入 record 與 old_record
    if (body.record && body.old_record) {
      const { record, old_record } = body;

      // 關鍵判定：狀態從「未核准」變更為「已核准」
      if (record.is_approved === true && old_record.is_approved === false) {
        const userMessage = {
          to: record.line_user_id, // 發送給該商品的刊登用戶
          messages: [
            {
              type: 'flex',
              altText: `✅ 您的商品【${record.name}】已審核通過！`,
              contents: createFlexBubble(
                "✅ 審核通過通知", 
                record.name, 
                record.price, 
                "您的商品已成功上架！買家現在可以在首頁看到它了。", 
                "#1DB446", // 綠色標題
                record.image_url
              )
            }
          ]
        };

        await sendToLine(userMessage);
        return NextResponse.json({ success: true, mode: 'user_approval_notification' });
      }
      return NextResponse.json({ message: '狀態未變更，不執行通知' });
    }

    // --- 2. 處理前端主動觸發：新商品待審核通知 ---
    // 當用戶在 App 填寫完表單點擊「上架」時觸發
    const { name, price, imageUrl, contact } = body;
    
    if (!name || !price) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const adminMessage = {
      to: process.env.ADMIN_LINE_USER_ID, // 發送給你自己（管理員）
      messages: [
        {
          type: 'flex',
          altText: `📦 新商品待審核：${name}`,
          contents: createFlexBubble(
            "📦 新商品待審核", 
            name, 
            price, 
            `聯絡資訊：${contact || '未提供'}`, 
            "#D95300", // 橘色標題
            imageUrl
          )
        }
      ]
    };

    await sendToLine(adminMessage);
    return NextResponse.json({ success: true, mode: 'admin_new_listing_notification' });

  } catch (error: any) {
    console.error('Notify API 錯誤:', error);
    return NextResponse.json({ error: error.message || '內部伺服器錯誤' }, { status: 500 });
  }
}

/**
 * 封裝發送請求至 LINE Messaging API
 */
async function sendToLine(payload: any) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`LINE API 錯誤: ${JSON.stringify(errorData)}`);
  }
  return res;
}

/**
 * 封裝 Flex Message 氣泡樣式
 */
function createFlexBubble(title: string, name: string, price: any, subtext: string, titleColor: string, imageUrl: any) {
  // 處理圖片顯示邏輯，如果是陣列則取第一張
  let displayUrl = "https://your-domain.com/placeholder-logo.png"; // 請替換成你的預設圖網址
  if (imageUrl) {
    if (Array.isArray(imageUrl)) {
      displayUrl = imageUrl[0];
    } else if (typeof imageUrl === 'string') {
      try {
        const parsed = imageUrl.startsWith('[') ? JSON.parse(imageUrl) : imageUrl;
        displayUrl = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        displayUrl = imageUrl;
      }
    }
  }

  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: displayUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: title, weight: 'bold', color: titleColor, size: 'sm' },
        { type: 'text', text: name, weight: 'bold', size: 'xl', margin: 'md', color: '#333333' },
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
                { type: 'text', text: `NT$ ${Number(price).toLocaleString()}`, color: '#D95300', size: 'sm', flex: 4, weight: 'bold' }
              ]
            },
            { type: 'text', text: subtext, color: '#666666', size: 'xs', margin: 'md', wrap: true }
          ]
        }
      ]
    }
  };
}
