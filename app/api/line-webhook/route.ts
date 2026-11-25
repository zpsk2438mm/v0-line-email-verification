
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

const LINE_USER_ID_REGEX =
  /^U[0-9a-fA-F]{32}$/;

const LINE_REQUEST_TIMEOUT_MS = 10000;

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

// SHA-256 雜湊
function hashValue(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

// 驗證 LINE 官方簽章
function verifySignature(
  rawBody: Buffer,
  signature: string,
  channelSecret: string
): boolean {
  const expected = createHmac(
    "sha256",
    channelSecret
  )
    .update(rawBody)
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

// 共用 LINE API 請求
async function requestLine(
  endpoint: "reply" | "push",
  payload: Record<string, unknown>,
  accessToken: string
): Promise<void> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    LINE_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/message/${endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.error(
        `LINE ${endpoint} 失敗：HTTP`,
        response.status
      );
    }
  } catch {
    console.error(
      `LINE ${endpoint} 請求失敗或逾時`
    );
  } finally {
    clearTimeout(timer);
  }
}

// 回覆官方帳號訊息
async function replyLine(
  replyToken: string,
  message: string,
  accessToken: string
): Promise<void> {
  await requestLine(
    "reply",
    {
      replyToken,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    },
    accessToken
  );
}

// 主動發送 LINE 訊息
async function pushLine(
  messagingUserId: string,
  message: string,
  accessToken: string
): Promise<void> {
  await requestLine(
    "push",
    {
      to: messagingUserId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    },
    accessToken
  );
}

// 新版帳號配對結果
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
        "⚠️ 此 LINE 或網站帳號" +
        "已經完成綁定。"
      );

    default:
      return (
        "⚠️ 配對連結無效、已使用或已過期，" +
        "請重新傳送「啟用通知」。"
      );
  }
}

export async function POST(
  req: NextRequest
) {
  const channelSecret =
    process.env.LINE_MESSAGING_CHANNEL_SECRET;

  const accessToken =
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ==================================
  // 1. 檢查環境變數
  // ==================================

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

  // ==================================
  // 2. 驗證 LINE 官方簽章
  // ==================================

  const signature =
    req.headers.get("x-line-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "缺少簽章" },
      { status: 401 }
    );
  }

  let rawBody: Buffer;

  try {
    rawBody = Buffer.from(
      await req.arrayBuffer()
    );
  } catch {
    return NextResponse.json(
      { error: "無法讀取請求內容" },
      { status: 400 }
    );
  }

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

  // ==================================
  // 3. 解析 Webhook 事件
  // ==================================

  let body: LineWebhookBody;

  try {
    body = JSON.parse(
      rawBody.toString("utf8")
    );

    if (
      !body ||
      typeof body !== "object" ||
      !Array.isArray(body.events)
    ) {
      throw new Error("Invalid body");
    }
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
        detectSessionInUrl: false,
      },
    }
  );

  let processingFailed = false;

  for (const event of body.events ?? []) {
    if (
      !event ||
      typeof event !== "object"
    ) {
      continue;
    }

    const messagingUserId =
      event.source?.userId;

    if (
      event.source?.type !== "user" ||
      typeof messagingUserId !== "string" ||
      !LINE_USER_ID_REGEX.test(
        messagingUserId
      )
    ) {
      continue;
    }

    try {
      // ==================================
      // 4. 新版 LINE Account Linking
      // ==================================

      if (event.type === "accountLink") {
        const nonce = event.link?.nonce;

        if (
          event.link?.result !== "ok" ||
          typeof nonce !== "string" ||
          nonce.length === 0 ||
          nonce.length > 255
        ) {
          continue;
        }

        const nonceHash =
          hashValue(nonce);

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
            "Account Linking RPC 錯誤：",
            error.code
          );

          throw error;
        }

        const result =
          typeof data === "string"
            ? data
            : "invalid";

        await pushLine(
          messagingUserId,
          accountLinkMessage(result),
          accessToken
        );

        continue;
      }

      // ==================================
      // 5. 處理 LINE 文字訊息
      // ==================================

      if (
        event.type !== "message" ||
        event.message?.type !== "text" ||
        typeof event.message.text !==
          "string" ||
        typeof event.replyToken !==
          "string" ||
        !event.replyToken
      ) {
        continue;
      }

      const message =
        event.message.text.trim();

      // ==================================
      // 6. 啟用 LINE 商品通知
      // ==================================

      if (message === "啟用通知") {
        const {
          data: existing,
          error: lookupError,
        } = await admin
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

        // 建立一次性隨機配對票券

        const ticket = randomBytes(32)
          .toString("hex");

        const ticketHash =
          hashValue(ticket);

        const expiresAt = new Date(
          Date.now() + 10 * 60 * 1000
        ).toISOString();

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
            insertError.code
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
            "完成配對後，就可以收到商品通知！",
          accessToken
        );

        continue;
      }

      // ==================================
      // 7. 舊版六位數綁定已停止
      // 不再呼叫舊版綁定 RPC
      // ==================================

      if (/^[0-9]{6}$/.test(message)) {
        await replyLine(
          event.replyToken,
          "⚠️ 舊版六位數綁定功能已停止使用。\n\n" +
            "請直接傳送「啟用通知」，" +
            "取得新版專屬配對連結。🧡",
          accessToken
        );

        continue;
      }
    } catch {
      console.error(
        "LINE Webhook 事件處理失敗"
      );

      processingFailed = true;
    }
  }

  // 資料庫事件處理失敗時，
  // 回傳 500，讓 LINE 有機會重送。

  if (processingFailed) {
    return NextResponse.json(
      { error: "Webhook 處理失敗" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
