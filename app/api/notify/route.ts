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

    // 🎯 相容防線：相容前端直接打 API，以及 Supabase Webhook 的資料結構
    let type = body.type || 'INSERT'; 
    let productData = body.record || body; 

    if (type === 'DELETE') {
      productData = body.old_record || body;
    }

    // 驗證是否有 LINE 用戶 ID
    const lineUserId = productData.line_user_id || productData.lineUserId;
    if (!lineUserId) {
      console.log("找不到使用者的 Line ID，跳過通知");
      return NextResponse.json({ message: "找不到使用者的 Line ID，跳過通知" });
    }

    // 取得商品基本資訊
    const productName = productData.name || "未命名商品";
    const productPrice = productData.price || "0";
    const productStatus = productData.status;

    let title = "📦 商品刊登成功 (審核中)";
    let color = "#D35400"; // 暖橘色
    let subText = "管理員正在全力審核您的商品，審核通過或退回都會第一時間通知您喔！";

    // 🎯 狀態判定：精準對齊 'approved'、'rejected'、'pending'
    if (type === 'UPDATE' || body.status || productStatus) {
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
      } else if (type === 'UPDATE' && !productStatus) {
        return NextResponse.json({ message: "狀態無變更，略過通知" });
      }
    } else if (type === 'DELETE') {
      title = "❌ 商品已被移除";
      color = "#64748B"; // 灰藍色
      subText = "您的商品已被下架或刪除。";
    }

    // 安全轉換價格數字，防止出現 NaN 導致 LINE 噴 400 錯誤
    const parsedPrice = parseInt(String(productPrice).replace(/[^0-9]/g, ''), 10);
    const displayPrice = isNaN(parsedPrice) ? "0" : parsedPrice.toLocaleString();

    // 🎯 LINE 官方認證最安全、標準的 Flex Message 樹狀結構
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
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  {
                    type: 'text',
                    text: title,
                    weight: 'bold', // 👈 確保符合 LINE 官方規範
                    color: color,
                    size: 'md'
                  },
                  {
                    type: 'text',
                    text: productName,
                    weight: 'bold', // 👈 🎯 修正處：將原本非法的 'black' 改為標準的 'bold'
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
                        weight: 'bold', // 👈 確保符合 LINE 官方規範
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
                ]
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

    // 呼叫 LINE Messaging API
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

    console.log("🟢 LINE 通訊分發成功！");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("💥 Notify 路由發生崩潰:", err);
    return NextResponse.json({ error: "伺服器內部錯誤", details: err.message }, { status: 500 });
  }
}
