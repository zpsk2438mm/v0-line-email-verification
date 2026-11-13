
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createHash,
  randomBytes,
} from "crypto";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashValue(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    // 驗證 LINE 登入與南臺學校信箱
    const {
      admin,
      email,
      lineUserId,
    } = await verifiedIdentity(req);

    const accessToken =
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "LINE 通知服務尚未設定" },
        { status: 500 }
      );
    }

    // 讀取官方帳號發出的配對邀請
    const body = await req.json().catch(() => null);
    const ticket = body?.ticket;

    if (
      typeof ticket !== "string" ||
      !/^[a-f0-9]{64}$/.test(ticket)
    ) {
      return NextResponse.json(
        { error: "配對連結格式不正確" },
        { status: 400 }
      );
    }

    // 確認網站帳號沒有綁定過
    const { data: existing, error: checkError } =
      await admin
        .from("line_notification_bindings")
        .select("line_login_user_id")
        .eq("line_login_user_id", lineUserId)
        .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existing) {
      return NextResponse.json(
        { error: "你的網站帳號已經啟用 LINE 通知" },
        { status: 409 }
      );
    }

    // 建立 LINE Account Linking 專用 nonce
    const nonce = randomBytes(32)
      .toString("hex");

    // 原子化使用邀請，並儲存 nonce
    const { data: messagingUserId, error: claimError } =
      await admin.rpc("claim_line_link_ticket", {
        p_ticket_hash: hashValue(ticket),
        p_nonce_hash: hashValue(nonce),
        p_line_login_user_id: lineUserId,
        p_verified_email: email,
      });

    if (claimError) {
      console.error(
        "使用配對邀請失敗:",
        claimError.message
      );
      throw claimError;
    }

    if (
      typeof messagingUserId !== "string" ||
      !messagingUserId
    ) {
      return NextResponse.json(
        {
          error:
            "配對連結已過期、已使用，或帳號已完成綁定。請回 LINE 重新傳送「啟用通知」。",
        },
        { status: 400 }
      );
    }

    // 向 LINE Messaging API 取得專用 Link Token
    const response = await fetch(
      `https://api.line.me/v2/bot/user/${encodeURIComponent(
        messagingUserId
      )}/linkToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(
        "LINE Link Token 取得失敗:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            "LINE 暫時無法建立配對連結，請回官方帳號重新傳送「啟用通知」。",
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    if (
      typeof result.linkToken !== "string" ||
      !result.linkToken
    ) {
      throw new Error("LINE 未回傳 Link Token");
    }

    // 產生 LINE 官方 Account Linking 確認網址
    const url = new URL(
      "https://access.line.me/dialog/bot/accountLink"
    );

    url.searchParams.set(
      "linkToken",
      result.linkToken
    );

    url.searchParams.set("nonce", nonce);

    return NextResponse.json({
      success: true,
      linkUrl: url.toString(),
    });
  } catch (error) {
    console.error(
      "LINE Account Linking API 失敗:",
      error instanceof Error
        ? error.message
        : "未知錯誤"
    );

    return NextResponse.json(
      {
        error:
          "無法建立 LINE 配對連結，請確認已完成 LINE 登入及學校信箱驗證。",
      },
      { status: 500 }
    );
  }
}
