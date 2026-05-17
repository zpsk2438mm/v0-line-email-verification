import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("錯誤：缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
      return NextResponse.json({ error: "伺服器設定錯誤" }, { status: 500 });
    }

    const body = await req.json();
    console.log("收到通知請求內容:", JSON.stringify(body));

    // 🎯 1. 判定事件類型
    let type = body.type || 'INSERT'; 
    
    // 🎯 2. 解析資料本體
    let productData = body.record || body; 

    if (type === 'DELETE') {
      productData = body.old_record || body;
    }

    // 🎯 3. 取得 LINE 用戶 ID
    const lineUserId = productData.line_user_id || productData.lineUserId || body.line_user_id || body.lineUserId;
    if (!lineUserId) {
      console.log("⚠️ 找不到使用者的 Line ID，跳過通知。");
      return NextResponse.json({ message: "找不到使用者的 Line ID，跳過通知" });
    }

    // 取得商品基本資訊
    const productName = productData.name || "未命名商品";
    const productPrice = productData.price || "0";
    
    // 🎯 4. 取得商品圖片網址 (相容直接傳入的 productImage 或 record 裡的 image_url)
    const rawImageUrl = body.productImage || productData.image_url || body.image_url;
    
    // 解析圖片網址（過濾掉可能存在的陣列括號字串）
    let parsedImageUrl = "";
    if (rawImageUrl) {
      try {
        if (Array.isArray(rawImageUrl)) {
          parsedImageUrl = rawImageUrl[0];
        } else if (typeof rawImageUrl === 'string' && rawImageUrl.startsWith('[')) {
          const parsed = JSON.parse(rawImageUrl);
          parsedImageUrl = Array.isArray(parsed) ? parsed[0] : rawImageUrl;
        } else {
          parsedImageUrl = rawImageUrl;
        }
        parsedImageUrl = parsedImageUrl.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim();
      } catch (e) {
        parsedImageUrl = "";
      }
    }

    // 🎯 5. 精準狀態撈取
    const productStatus = productData.status || body.status;

    let title = "📦 商品刊登成功 (審核中)";
    let color = "#D35400"; // 暖橘色
    let subText = "管理員正在全力審核您的商品，審核通過或退回都會第一時間通知您喔！";

    console.log(`正在處理事件: ${type}, 狀態為: ${productStatus}`);

    if (type === 'UPDATE' || productStatus) {
      if (productStatus === 'approved') {
        title = "🎉 商品審核通過！已成功上架";
        color = "#10B981"; // 翠綠色
        subText = "恭喜！您的二手寶貝已經在平台上公開展示，祝您順利成交！";
      } else if (productStatus === 'rejected') {
        title = "⚠️ 商品未通過審核 (已被退回)";
        color = "#EF4444"; // 玫瑰紅
        subText = "您的商品因未符合規範已被退回，您可以到「個人中心」查看並修改。";
      } else if (productStatus === 'pending') {
        title = "📦 商品刊登成功 (審核中)";
        color = "#D35400";
        subText = "管理員正在全力審核您的商品，審核通過或退回都會第一時間通知您喔！";
      } else {
        console.log("狀態無目標變更，略過通知");
        return NextResponse.json({ message: "狀態無目標變更，略過通知" });
      }
    } else if (type === 'DELETE') {
      title = "❌ 商品已被移除";
      color = "#64748B"; // 灰藍色
      subText = "您的商品已被下架或刪除。";
    }

    // 安全轉換價格數字
    const parsedPrice = parseInt(String(productPrice).replace(/[^0-9]/g, ''), 10);
    const displayPrice = isNaN(parsedPrice) ? "0" : parsedPrice.toLocaleString();

    // 🎯 6. 動態建立 Flex 內容元件陣列
    const bodyContents: any[] = [
      {
        type: 'text',
        text: title,
        weight: 'bold',
        color: color,
        size: 'md'
      },
      {
        type: 'text',
        text: productName,
        weight: 'bold',
        size: 'xl',
        wrap: true
      },
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: '預售價格：',
            size: 'sm',
            color: '#666666',
            flex: 0
          },
          {
            type: 'text',
            text: `NT$ ${displayPrice}`,
            weight: 'bold',
            size: 'md',
            color: '#D35400',
            flex: 1
          }
        ]
      },
      {
        type: 'text',
        text: subText,
        color: '#444444',
        size: 'sm',
        wrap: true
      }
    ];

    // 🎯 如果有成功的商品圖片網址，就在內文最前面塞入圖片元件
    if (parsedImageUrl && parsedImageUrl.startsWith('http')) {
      bodyContents.unshift({
        type: 'image',
        url: parsedImageUrl,
        aspectMode: 'cover',
        aspectRatio: '16:9',
        size: 'full',
        margin: 'none'
      });
    }

    // LINE 官方認證 Flex Message 結構
    const flexPayload = {
      to: lineUserId,
      messages: [{
        type: 'flex',
        altText: title,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: bodyContents // 注入動態內容
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'lg',
                contents: [
                  {
                    type: 'separator',
                    color: '#E5E5E5'
                  },
                  {
                    type: 'text',
                    text: "📍 南臺二手市集 · 自動通知系統",
                    size: 'xs',
                    color: '#A0A0A0',
                    margin: 'md'
                  }
                ]
              }
            ]
          }
        }
      }]
    };

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(flexPayload),
    });

    if (!response.ok) {
      const errorMsg = await response.json();
      console.error("🔴 LINE API 傳送失敗，完整錯誤回應：", JSON.stringify(errorMsg, null, 2));
      return NextResponse.json({ error: "LINE API 失敗", details: errorMsg }, { status: response.status });
    }

    console.log(`🟢 LINE 狀態更新通知分發成功！[狀態: ${productStatus}]`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("💥 Notify 路由發生崩潰:", err);
    return NextResponse.json({ error: "伺服器內部錯誤", details: err.message }, { status: 500 });
  }
}
