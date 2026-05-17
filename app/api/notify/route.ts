import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("錯誤：缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
      return NextResponse.json({ error: "伺服器設定錯誤" }, { status: 500 });
    }

    const body = await req.json();
    console.log("收到原始請求內容:", JSON.stringify(body));

    // 🎯 1. 判定事件類型 (Supabase Webhook 為 'INSERT' 或 'UPDATE')
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
    
    // 🎯 4. 全方位清洗商品圖片網址
    let rawImageUrl = body.productImage || productData.image_url || body.image_url;
    let parsedImageUrl = "";

    if (rawImageUrl) {
      try {
        if (Array.isArray(rawImageUrl)) {
          parsedImageUrl = rawImageUrl[0];
        } else if (typeof rawImageUrl === 'string' && (rawImageUrl.startsWith('[') || rawImageUrl.startsWith('{'))) {
          const parsed = JSON.parse(rawImageUrl);
          parsedImageUrl = Array.isArray(parsed) ? parsed[0] : (parsed.url || rawImageUrl);
        } else if (typeof rawImageUrl === 'string') {
          parsedImageUrl = rawImageUrl;
        }

        if (parsedImageUrl && typeof parsedImageUrl === 'string') {
          // 徹底拔除網址中殘留的 [ ] " ' \ 等干擾字元
          parsedImageUrl = parsedImageUrl.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim();
          
          // 🚀 【核心大補強】如果洗出來只是單純的檔名（不是 http 開頭），自動拼接上你的 Supabase Storage 完整網址
          if (parsedImageUrl && !parsedImageUrl.startsWith('http') && parsedImageUrl !== "/placeholder-logo.png") {
            const cleanPath = parsedImageUrl.replace(/^\//, ""); // 移除開頭斜線
            parsedImageUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
          }
        }
      } catch (e) {
        console.error("解析圖片網址出錯:", e);
        parsedImageUrl = "";
      }
    }

    console.log("🧼 [後端自動補全] 最終送往 LINE 的圖片網址為:", parsedImageUrl);

    // 🎯 5. 根據狀態決定文案與主題顏色
    const productStatus = productData.status || body.status;

    let title = "📦 商品刊登成功 (審核中)";
    let color = "#D35400"; // 暖橘色
    let subText = "管理員正在全力審核您的商品，審核通過或退回都會第一時間通知您喔！";

    if (productStatus === 'approved') {
      title = "🎉 商品審核通過！已成功上架";
      color = "#10B981"; // 翠綠色
      subText = "恭喜！您的二手寶貝已經在平台上公開展示，祝您順利成交！";
    } else if (productStatus === 'rejected') {
      title = "⚠️ 商品未通過審核 (已被退回)";
      color = "#EF4444"; // 玫瑰紅
      subText = "您的商品因未符合規範已被退回，您可以到「個人中心」查看並修改。";
    } else if (productStatus === 'pending' || type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      color = "#D35400";
      subText = "管理員正在全力審核您的商品，審核通過或退回都會第一時間通知您喔！";
    } else if (type === 'DELETE') {
      title = "❌ 商品已被移除";
      color = "#64748B"; // 灰藍色
      subText = "您的商品已被下架或刪除。";
    }

    // 安全轉換價格數字
    const parsedPrice = parseInt(String(productPrice).replace(/[^0-9]/g, ''), 10);
    const displayPrice = isNaN(parsedPrice) ? "0" : parsedPrice.toLocaleString();

    // 🎯 6. 建立標準的 LINE 氣泡結構
    const bubbleStructure: any = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'lg',
        spacing: 'md',
        contents: [
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
    };

    // 如果清洗補全出合法的圖片，直接掛載至 hero 區塊
    if (parsedImageUrl && parsedImageUrl.startsWith('http')) {
      bubbleStructure.hero = {
        type: 'image',
        url: parsedImageUrl,
        size: 'full',
        aspectRatio: '16:9',
        aspectMode: 'cover'
      };
    }

    const flexPayload = {
      to: lineUserId,
      messages: [{
        type: 'flex',
        altText: title,
        contents: bubbleStructure
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

    console.log(`🟢 LINE 通知發送成功！`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("💥 Notify 路由發生崩潰:", err);
    return NextResponse.json({ error: "伺服器內部錯誤", details: err.message }, { status: 500 });
  }
}
