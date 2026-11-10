
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createHmac,
  createHash,
  timingSafeEqual,
} from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LineEvent {
  type: string;
  source?: {
    type?: string;
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
  replyToken?: string;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery?: boolean;
  };
}

interface LineWebhookBody {
  events?: LineEvent[];
}

// 驗證 LINE 官方請求簽章
function verifySignature(
  rawBody: string,
  signature: string,
  channelSecret: string
): boolean {
  const expected = createHmac(
    "sha256",
    channelSecret
  )
    .update(rawBody, "utf8")
    .digest();

  let received: Buffer;

  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

// 將綁定碼轉換為 SHA-256
function hashCode(code: string): string {
  return createHash("sha256")
    .update(code)
    .digest("hex");
}

// 回覆 LINE 訊息
async function replyLine(
  replyToken: string,
  message: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error(
      "LINE 回覆訊息失敗，HTTP:",
      response.status
    );
  }
}

// 將資料庫回傳結果轉換成提示訊息
function bindingResultMessage(
  result: string
): string {
  switch (result) {
    case "success":
      return (
        "🎉 LINE 商品通知綁定成功！\n\n" +
        "你的南臺二手物平台帳號已成功連結「資想聽你說」。\n\n" +
        "之後有買家點擊你商品的「聯絡賣家」，" +
        "就可以透過本官方帳號收到通知。"
      );

    case "already_bound":
      return (
        "⚠️ 此 LINE 帳號或網站帳號已完成綁定。\n\n" +
        "如果需要更換綁定帳號，請先解除原本的綁定。"
      );

    case "rate_limited":
      return (
        "⚠️ 綁定碼嘗試次數過多。\n\n" +
        "請等待 15 分鐘後再試。"
      );

    case "invalid_code":
    case "invalid":
      return (
        "❌ 綁定碼無效或已過期。\n\n" +
        "請回到南臺二手物平台重新產生綁定碼，" +
        "並在 10 分鐘內傳送給我。"
      );

    default:
      return (
        "⚠️ 綁定暫時無法完成，請稍後再試。"
      );
  }
}

export async function POST(req: NextRequest) {
  const channelSecret =
    process.env.LINE_MESSAGING_CHANNEL_SECRET;

  const accessToken =
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !channelSecret ||
    !accessToken ||
    !supabaseUrl ||
    !serviceKey
  ) {
    console.error(
      "LINE Webhook 缺少必要環境變數"
    );

    return NextResponse.json(
      { error: "伺服器設定不完整" },
      { status: 500 }
    );
  }

  // LINE 簽章驗證
  const signature =
    req.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "缺少 LINE 簽章" },
      { status: 401 }
    );
  }

  const rawBody = await req.text();

  if (
    !verifySignature(
      rawBody,
      signature,
      channelSecret
    )
  ) {
    return NextResponse.json(
      { error: "LINE 簽章驗證失敗" },
      { status: 401 }
    );
  }

  let body: LineWebhookBody;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "無效的 JSON" },
      { status: 400 }
    );
  }

  const admin = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const events = Array.isArray(body.events)
    ? body.events
    : [];

  for (const event of events) {
    // 只處理使用者傳送的文字訊息
    if (
      event.type !== "message" ||
      event.source?.type !== "user" ||
      event.message?.type !== "text" ||
      !event.source.userId ||
      !event.replyToken
    ) {
      continue;
    }

    const message = (
      event.message.text || ""
    ).trim();

    // 只接受六位數綁定碼
    // 一般聊天訊息不會觸發綁定
    if (!/^[0-9]{6}$/.test(message)) {
      continue;
    }

    const messagingUserId =
      event.source.userId;

    const codeHash = hashCode(message);

    try {
      // 呼叫 Supabase 原子性綁定函式
      // 驗證、限流及資料寫入都在資料庫完成
      const { data, error } = await admin.rpc(
        "complete_line_binding",
        {
          p_code_hash: codeHash,
          p_messaging_user_id:
            messagingUserId,
        }
      );

      if (error) {
        console.error(
          "LINE 綁定資料庫操作失敗:",
          error.code,
          error.message
        );

        await replyLine(
          event.replyToken,
          "⚠️ 系統暫時無法完成綁定，請稍後再試。",
          accessToken
        );

        continue;
      }

      const result = String(data || "");

      await replyLine(
        event.replyToken,
        bindingResultMessage(result),
        accessToken
      );
    } catch (error) {
      console.error(
        "LINE 綁定事件處理失敗:",
        error instanceof Error
          ? error.message
          : "未知錯誤"
      );

      // 不讓單一事件的失敗影響其他事件
    }
  }

  return NextResponse.json({
    success: true,
  });
}
