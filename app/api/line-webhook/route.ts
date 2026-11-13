
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
  link?: {
    result?: string;
    nonce?: string;
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

// 驗證 LINE Webhook 簽章
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

// SHA-256 雜湊
function hashValue(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
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
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    console.error(
      "LINE 回覆訊息失敗:",
      response.status,
      await response.text().catch(() => "")
    );
  }
}

// 舊版六位數綁定結果
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
      return "⚠️ 綁定暫時無法完成，請稍後再試。";
  }
}

// 新版 LINE Account Linking 結果
function accountLinkResultMessage(
  result: string
): string {
  switch (result) {
    case "success":
      return (
        "🎉 LINE 商品通知已成功啟用！\n\n" +
        "你的「資想聽你說」網站帳號" +
        "已經和 LINE 官方帳號完成安全配對。\n\n" +
        "以後有買家點擊你的商品「聯絡賣家」，" +
        "就會透過本官方帳號通知你。\n\n" +
        "不需要再輸入六位數綁定碼！🧡"
      );

    case "already_bound":
      return (
        "⚠️ 你的 LINE 帳號已經綁定通知。\n\n" +
        "如果需要更換帳號，請先解除原本的綁定。"
      );

    case "invalid":
      return (
        "⚠️ 配對連結已過期或無效。\n\n" +
        "請重新開啟網站，取得新的配對連結。"
      );

    default:
      return (
        "⚠️ LINE 通知配對暫時失敗，請稍後再試。"
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

  // 驗證 LINE 官方簽章
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
    const messagingUserId =
      event.source?.userId;

    if (
      event.source?.type !== "user" ||
      !messagingUserId
    ) {
      continue;
    }

    try {
      // 新版：LINE Account Linking
      if (event.type === "accountLink") {
        const linkResult =
          event.link?.result;

        const nonce =
          event.link?.nonce;

        // 只有 LINE 確認成功的事件才能綁定
        if (
          linkResult !== "ok" ||
          !nonce
        ) {
          console.log(
            "LINE Account Linking 未成功完成"
          );
          continue;
        }

        const nonceHash =
          hashValue(nonce);

        // 由 Supabase 驗證 nonce 是否有效、
        // 是否過期、是否已經使用
        const { data, error } = await admin.rpc(
          "complete_line_account_link",
          {
            p_nonce_hash: nonceHash,
            p_messaging_user_id:
              messagingUserId,
          }
        );

        if (error) {
          console.error(
            "LINE Account Linking 資料庫失敗:",
            error.code,
            error.message
          );

          // 失敗時拋出錯誤，讓 LINE 可以重送事件
          throw error;
        }

        const result = String(
          data || ""
        );

        console.log(
          "LINE Account Linking 結果:",
          result
        );

        // accountLink 事件沒有 replyToken，
        // 因此使用 Push API 發送結果
        if (
          result === "success" ||
          result === "already_bound" ||
          result === "invalid"
        ) {
          const response = await fetch(
            "https://api.line.me/v2/bot/message/push",
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                to: messagingUserId,
                messages: [
                  {
                    type: "text",
                    text:
                      accountLinkResultMessage(
                        result
                      ),
                  },
                ],
              }),
              signal:
                AbortSignal.timeout(5000),
            }
          );

          if (!response.ok) {
            console.error(
              "LINE 配對結果通知失敗:",
              response.status,
              await response
                .text()
                .catch(() => "")
            );
          }
        }

        continue;
      }

      // 舊版：六位數綁定碼
      // 暫時保留，避免影響原本使用者
      if (
        event.type !== "message" ||
        event.message?.type !== "text" ||
        !event.replyToken
      ) {
        continue;
      }

      const message = (
        event.message.text || ""
      ).trim();

      // 只接受六位數
      if (!/^[0-9]{6}$/.test(message)) {
        continue;
      }

      const codeHash =
        hashValue(message);

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
          "舊版 LINE 綁定資料庫失敗:",
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

      await replyLine(
        event.replyToken,
        bindingResultMessage(
          String(data || "")
        ),
        accessToken
      );
    } catch (error) {
      console.error(
        "LINE Webhook 事件處理失敗:",
        error instanceof Error
          ? error.message
          : "未知錯誤"
      );

      // Account Linking 的資料庫錯誤，
      // 不應回報成處理成功
      if (event.type === "accountLink") {
        return NextResponse.json(
          { error: "Account Linking 處理失敗" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
  });
}
