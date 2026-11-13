
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  "https://v0-supabase-form-integration-two.vercel.app";

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
}

interface LineWebhookBody {
  events?: LineEvent[];
}

function hashValue(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

// 確認請求真的來自 LINE
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

  const received = Buffer.from(
    signature,
    "base64"
  );

  return (
    received.length === expected.length &&
    timingSafeEqual(expected, received)
  );
}

// 回覆官方帳號訊息
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
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `LINE 回覆失敗：HTTP ${response.status}`
    );
  }
}

// 主動發送 LINE 訊息
async function pushLine(
  messagingUserId: string,
  message: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/push",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: messagingUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error(
      "LINE Push 失敗：",
      response.status
    );
  }
}

// 舊版六位數綁定回覆
function oldBindingMessage(
  result: string
): string {
  switch (result) {
    case "success":
      return (
        "🎉 LINE 商品通知綁定成功！\n\n" +
        "之後有買家聯絡你的商品，" +
        "就可以收到官方帳號通知。"
      );

    case "already_bound":
      return (
        "⚠️ 這個 LINE 或網站帳號已經綁定，" +
        "不需要重複操作。"
      );

    case "rate_limited":
      return (
        "⚠️ 嘗試次數過多，" +
        "請稍後再試。"
      );

    default:
      return (
        "❌ 綁定碼無效或已過期，" +
        "請回網站重新產生。"
      );
  }
}

// 新版帳號連結結果
function accountLinkMessage(
  result: string
): string {
  switch (result) {
    case "success":
      return (
        "🎉 LINE 商品通知啟用成功！\n\n" +
        "你的「資想聽你說」網站帳號" +
        "已經成功連結官方帳號。\n\n" +
        "之後有買家聯絡你的商品，" +
        "就可以收到 LINE 通知。🧡"
      );

    case "already_bound":
      return (
        "⚠️ 此 LINE 或網站帳號已經完成綁定。"
      );

    default:
      return (
        "⚠️ 配對連結無效或已過期，" +
        "請重新傳送「啟用通知」。"
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
      "LINE Webhook 缺少環境變數"
    );

    return NextResponse.json(
      { error: "伺服器設定不完整" },
      { status: 500 }
    );
  }

  // 驗證 LINE 簽章
  const signature =
    req.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "缺少簽章" },
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
      { error: "簽章驗證失敗" },
      { status: 401 }
    );
  }

  let body: LineWebhookBody;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "JSON 格式錯誤" },
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
      // ==================================
      // 1. 新版 LINE Account Linking
      // ==================================
      if (event.type === "accountLink") {
        if (
          event.link?.result !== "ok" ||
          !event.link.nonce
        ) {
          continue;
        }

        const nonceHash = hashValue(
          event.link.nonce
        );

        const { data, error } =
          await admin.rpc(
            "complete_line_account_link",
            {
              p_nonce_hash: nonceHash,
              p_messaging_user_id:
                messagingUserId,
            }
          );

        if (error) {
          console.error(
            "Account Linking 資料庫錯誤：",
            error.message
          );

          throw error;
        }

        const result = String(
          data || "invalid"
        );

        await pushLine(
          messagingUserId,
          accountLinkMessage(result),
          accessToken
        );

        continue;
      }

      // ==================================
      // 2. 處理 LINE 文字訊息
      // ==================================
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

      // ==================================
      // 3. 新增：啟用通知
      // ==================================
      if (message === "啟用通知") {
        // 已經完成綁定就不用再綁
        const { data: existing, error: lookupError } =
          await admin
            .from("line_notification_bindings")
            .select("line_login_user_id")
            .eq(
              "messaging_user_id",
              messagingUserId
            )
            .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        if (existing) {
          await replyLine(
            event.replyToken,
            "✅ 你已經啟用「資想聽你說」LINE 商品通知，不需要再次綁定！🧡",
            accessToken
          );

          continue;
        }

        // 建立高強度隨機配對邀請
        const ticket = randomBytes(32)
          .toString("hex");

        const ticketHash =
          hashValue(ticket);

        const expiresAt = new Date(
          Date.now() + 10 * 60 * 1000
        ).toISOString();

        // 只儲存雜湊值，不儲存原始 ticket
        const { error: insertError } =
          await admin
            .from("line_link_tickets")
            .insert({
              ticket_hash: ticketHash,
              messaging_user_id:
                messagingUserId,
              expires_at: expiresAt,
            });

        if (insertError) {
          console.error(
            "建立配對邀請失敗：",
            insertError.message
          );

          throw insertError;
        }

        const link =
          `${SITE_URL}/line-link?ticket=${ticket}`;

        await replyLine(
          event.replyToken,
          "🧡 歡迎使用「資想聽你說」！\n\n" +
            "請點擊下面的專屬連結，" +
            "完成 LINE 商品通知配對：\n\n" +
            link +
            "\n\n⏰ 連結有效時間為 10 分鐘。\n" +
            "🔒 請勿將此連結分享給其他人。\n\n" +
            "完成配對後，就不用再輸入六位數綁定碼！",
          accessToken
        );

        continue;
      }

      // ==================================
      // 4. 保留舊版六位數綁定
      // ==================================
      if (/^[0-9]{6}$/.test(message)) {
        const codeHash =
          hashValue(message);

        const { data, error } =
          await admin.rpc(
            "complete_line_binding",
            {
              p_code_hash: codeHash,
              p_messaging_user_id:
                messagingUserId,
            }
          );

        if (error) {
          console.error(
            "六位數綁定失敗：",
            error.message
          );

          await replyLine(
            event.replyToken,
            "⚠️ 綁定暫時失敗，請稍後再試。",
            accessToken
          );

          continue;
        }

        await replyLine(
          event.replyToken,
          oldBindingMessage(
            String(data || "invalid")
          ),
          accessToken
        );
      }
    } catch (error) {
      console.error(
        "LINE Webhook 處理失敗：",
        error instanceof Error
          ? error.message
          : "未知錯誤"
      );

      // 資料庫處理失敗時，
      // 讓 LINE 有機會重新傳送事件
      return NextResponse.json(
        { error: "Webhook 處理失敗" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
  });
}
