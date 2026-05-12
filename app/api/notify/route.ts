import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 確保這裡抓到的是你在 v0 設定的 Token
    const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!CHANNEL_ACCESS_TOKEN) {
      console.error("錯誤：缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
      return NextResponse.json({ error: "伺服器設定錯誤" }, { status: 500 });
    }

    const body = await req.json();
    const { type, record, old_record } = body;

    // 判斷是新刊登、更新還是刪除
    const data = type === 'DELETE' ? old_record : record;

    // 如果沒有 Line ID，就無法傳送通知
    if (!data?.line_user_id) {
      return NextResponse.json({ message: "找不到使用者的 Line ID，跳過通知" });
    }

    let title = "商品狀態更新";
    let color = "#3B82F6"; // 藍色
    let subText = "";

    // 根據 Supabase 的觸發類型決定通知內容
    if (type === 'INSERT') {
      title = "📦 商品刊登成功 (審核中)";
      subText = "管理員正在審核您的商品，通過後會再次通知您。";
      color = "#F59E0B"; // 橘色
    } else if (type === 'UPDATE' && record.is_approved && !old_record?.is_approved) {
      title = "✅ 審核通過通知";
      color = "#10B981"; // 綠色
      subText = "恭喜！您的商品已通過審核並成功上架。";
    } else if (type === 'DELETE') {
      title = "❌ 商品已被移除";
      color = "#EF4444"; // 紅色
      subText = "您的商品已被刪除或未通過規範，如有疑問請聯絡管理員。";
    } else {
      return NextResponse.json({ message: "不符合通知條件，略過" });
    }

    // 呼叫 LINE Messaging API 傳送 Flex Message
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: data.line_user_id,
        messages: [{
          type: 'flex',
          altText: title,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: title, weight: 'bold', color: color, size: 'md' },
                { type: 'text', text: data.name || "未命名商品", weight: 'bold', size: 'xl', margin: 'md', wrap: true },
                { type: 'text', text: subText, color: '#666666', size: 'xs', margin: 'md', wrap: true },
                { type: 'separator', margin: 'lg' },
                { type: 'text', text: "南臺二手市集 - 自動通知系統", size: 'xxs', color: '#aaaaaa', margin: 'md' }
              ]
            }
          }
        }]
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.json();
      console.error("LINE API 傳送失敗:", errorMsg);
      return NextResponse.json({ error: "LINE API 失敗" }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify 路由發生崩潰:", err);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
