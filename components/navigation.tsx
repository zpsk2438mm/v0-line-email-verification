import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { sellerLineId, productName, productPrice, buyerName } = await request.json();

    if (!sellerLineId) {
      return NextResponse.json({ error: "缺少賣家 LINE ID (UID)" }, { status: 400 });
    }

    // 從環境變數取得 LINE Channel Access Token
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
      return NextResponse.json({ error: "伺服器未配置 LINE 憑證" }, { status: 500 });
    }

    // 組合給賣家的 LINE Flex Message 通知卡片樣式
    const flexMessage = {
      to: sellerLineId, // 這裡必須是賣家的 LINE 用戶唯一識別碼 (UID)，例如 Uf7c4668bc...
      messages: [
        {
          type: "flex",
          altText: `🔔 夥伴注意！有人想購買你的商品【${productName}】`,
          contents: {
            type: "bubble",
            size: "giga",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              contents: [
                {
                  type: "text",
                  text: "📦 收到買家購買意願",
                  weight: "bold",
                  color: "#D35400",
                  size: "md"
                },
                {
                  type: "text",
                  text: productName,
                  weight: "bold",
                  size: "xxl",
                  margin: "md",
                  wrap: true
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  margin: "md",
                  contents: [
                    {
                      type: "text",
                      text: "預售價格：",
                      color: "#888888",
                      size: "sm",
                      flex: 2
                    },
                    {
                      type: "text",
                      text: `NT$ ${Number(productPrice).toLocaleString()}`,
                      weight: "bold",
                      size: "lg",
                      color: "#D35400",
                      flex: 5
                    }
                  ]
                },
                {
                  type: "text",
                  text: `有一位買家對您的商品非常感興趣！請至市集後台或直接在群組內留意與買家的聯繫喔！`,
                  wrap: true,
                  color: "#555555",
                  size: "sm",
                  margin: "lg"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "separator",
                  margin: "sm"
                },
                {
                  type: "text",
                  text: "南臺二手市集 · 自動通知系統",
                  size: "xs",
                  color: "#aaaaaa",
                  align: "start",
                  margin: "md"
                }
              ]
            }
          }
        }
      ]
    };

    // 發送請求給 LINE 官方伺服器
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(flexMessage),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("LINE API 回傳錯誤:", errorData);
      return NextResponse.json({ error: "LINE 通知發送失敗" }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "LINE 通知已成功發送給賣家" });
  } catch (error: any) {
    console.error("發送通知出錯:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
