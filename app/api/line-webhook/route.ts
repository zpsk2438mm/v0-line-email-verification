
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

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
}

interface LineWebhookBody {
  destination?: string;
  events?: LineEvent[];
}

function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const expected = createHmac(
    "sha256",
    channelSecret
  )
    .update(body, "utf8")
    .digest();

  let received: Buffer;

  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export async function POST(req: NextRequest) {
  try {
    const channelSecret =
      process.env.LINE_MESSAGING_CHANNEL_SECRET;

    if (!channelSecret) {
      console.error("LINE Webhook Secret 尚未設定");

      return NextResponse.json(
        { error: "伺服器設定不完整" },
        { status: 500 }
      );
    }

    const signature =
      req.headers.get("x-line-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "缺少 LINE 簽章" },
        { status: 401 }
      );
    }

    // 必須使用原始請求內容驗證簽章
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

    const body: LineWebhookBody =
      JSON.parse(rawBody);

    const events = Array.isArray(body.events)
      ? body.events
      : [];

    for (const event of events) {
      // 目前只確認事件有成功送達
      // 不記錄 LINE User ID 或私人訊息內容
      console.log("LINE Webhook event:", {
        type: event.type,
        sourceType: event.source?.type,
        messageType: event.message?.type,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("LINE Webhook 處理失敗:", error);

    return NextResponse.json(
      { error: "Webhook 處理失敗" },
      { status: 500 }
    );
  }
}
