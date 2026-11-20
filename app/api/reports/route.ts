
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_REASONS = [
  "fraud",
  "prohibited",
  "misleading",
  "spam",
  "harassment",
  "other",
];

const REASON_LABELS: Record<string, string> = {
  fraud: "疑似詐騙",
  prohibited: "違禁或禁止刊登商品",
  misleading: "商品資訊不實",
  spam: "垃圾訊息或重複刊登",
  harassment: "騷擾或不當內容",
  other: "其他原因",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// 建立賣家收到的 LINE 檢舉通知卡片
function createReportFlexMessage(
  productName: string,
  reason: string
) {
  const reasonLabel =
    REASON_LABELS[reason] || "其他原因";

  return {
    type: "flex",
    altText: "⚠️ 您的商品收到檢舉通知",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "⚠️ 商品收到檢舉",
            weight: "bold",
            size: "lg",
            color: "#D35400",
            wrap: true,
          },
          {
            type: "text",
            text: productName || "未命名商品",
            weight: "bold",
            size: "xl",
            color: "#222222",
            wrap: true,
          },
          {
            type: "separator",
            color: "#EEEEEE",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "檢舉原因",
                size: "xs",
                color: "#888888",
              },
              {
                type: "text",
                text: reasonLabel,
                size: "md",
                weight: "bold",
                color: "#444444",
                wrap: true,
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "目前商品狀態",
                size: "xs",
                color: "#888888",
              },
              {
                type: "text",
                text: "已暫時隱藏，等待管理員審核",
                size: "sm",
                weight: "bold",
                color: "#D35400",
                wrap: true,
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFF7ED",
            cornerRadius: "md",
            paddingAll: "md",
            contents: [
              {
                type: "text",
                text:
                  "您的商品已收到使用者檢舉，平台已暫時隱藏該商品，並交由管理員審核。",
                size: "sm",
                color: "#555555",
                wrap: true,
              },
              {
                type: "text",
                text:
                  "收到檢舉不代表違規成立，請等待管理員審核結果。",
                size: "sm",
                color: "#777777",
                wrap: true,
                margin: "md",
              },
            ],
          },
          {
            type: "separator",
            color: "#EEEEEE",
            margin: "md",
          },
          {
            type: "text",
            text: "📍 南臺二手市集 · 自動通知系統",
            size: "xs",
            color: "#999999",
            wrap: true,
          },
        ],
      },
    },
  };
}

// 檢舉成功後，通知商品賣家
async function notifySellerAboutReport(
  admin: any,
  sellerLoginId: string | null,
  productName: string,
  reason: string
): Promise<void> {
  try {
    if (!sellerLoginId) {
      console.log(
        "[Report Notification] 商品沒有賣家 LINE ID"
      );
      return;
    }

    const channelAccessToken =
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
      console.error(
        "[Report Notification] 缺少 LINE Channel Access Token"
      );
      return;
    }

    // 使用既有 LINE Account Linking 資料表
    const { data: binding, error: bindingError } =
      await admin
        .from("line_notification_bindings")
        .select("messaging_user_id")
        .eq("line_login_user_id", sellerLoginId)
        .maybeSingle();

    if (bindingError) {
      console.error(
        "[Report Notification] 查詢 LINE 綁定失敗:",
        bindingError
      );
      return;
    }

    // 必須使用 LINE Messaging API 的 User ID
    // 不直接使用 LINE Login ID，避免發送至錯誤對象
    const recipientLineId =
      binding?.messaging_user_id;

    if (!recipientLineId) {
      console.log(
        "[Report Notification] 賣家尚未綁定 LINE 官方帳號"
      );
      return;
    }

    const flexMessage = createReportFlexMessage(
      productName,
      reason
    );

    const response = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({
          to: recipientLineId,
          messages: [flexMessage],
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "[Report Notification] LINE 發送失敗:",
        {
          status: response.status,
          details: errorText,
        }
      );
      return;
    }

    console.log(
      "[Report Notification] 賣家檢舉通知已提交"
    );
  } catch (error) {
    // 通知失敗不可影響已成功建立的檢舉
    console.error(
      "[Report Notification] 發送通知發生錯誤:",
      error
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. 驗證 LINE 登入與學校信箱
    const { admin, lineUserId, email } =
      await verifiedIdentity(req);

    // 2. 取得 Supabase 使用者身分
    const bearer = req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!bearer) {
      return fail("請先完成學校信箱驗證", 401);
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(bearer);

    if (
      userError ||
      !user ||
      user.email?.toLowerCase() !== email
    ) {
      return fail("使用者身分驗證失敗", 401);
    }

    // 3. 解析檢舉資料
    const raw = await req.text();

    if (raw.length > 10000) {
      return fail("檢舉資料過大", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail("檢舉資料格式不正確");
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail("請提供有效的檢舉資料");
    }

    const input = body as Record<string, unknown>;

    const productId =
      typeof input.productId === "string"
        ? input.productId.trim()
        : "";

    const reason =
      typeof input.reason === "string"
        ? input.reason.trim()
        : "";

    const description =
      typeof input.description === "string"
        ? input.description.trim()
        : "";

    // 4. 驗證欄位
    if (!UUID_PATTERN.test(productId)) {
      return fail("商品 ID 格式不正確");
    }

    if (!VALID_REASONS.includes(reason)) {
      return fail("請選擇有效的檢舉原因");
    }

    if (description.length > 2000) {
      return fail("補充說明不可超過 2000 字");
    }

    // 5. 確認商品存在且仍然公開上架
    const {
      data: product,
      error: productError,
    } = await admin
      .from("products")
      .select(
        "id, name, line_user_id, status, is_approved"
      )
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      console.error(
        "查詢商品失敗:",
        productError
      );
      return fail("無法確認商品資料", 500);
    }

    if (
      !product ||
      product.status !== "approved" ||
      product.is_approved !== true
    ) {
      return fail("商品不存在或已經下架", 404);
    }

    // 6. 不允許檢舉自己刊登的商品
    if (product.line_user_id === lineUserId) {
      return fail(
        "不能檢舉自己刊登的商品",
        403
      );
    }

    // 7. 防止同一使用者重複檢舉
    const {
      data: existing,
      error: existingError,
    } = await admin
      .from("product_reports")
      .select("id")
      .eq("product_id", productId)
      .eq("reporter_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "檢查重複檢舉失敗:",
        existingError
      );

      return fail("無法確認檢舉紀錄", 500);
    }

    if (existing) {
      return fail(
        "你已經檢舉過這項商品",
        409
      );
    }

    // 8. 呼叫原本的資料庫函式
    // 建立檢舉紀錄 + 立即隱藏商品
    // 保留既有的交易流程
    const {
      data: reportId,
      error: rpcError,
    } = await admin.rpc(
      "submit_product_report",
      {
        p_product_id: productId,
        p_reporter_id: user.id,
        p_reason: reason,
        p_description: description,
      }
    );

    if (rpcError) {
      console.error(
        "檢舉與隱藏商品 RPC 失敗:",
        {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        }
      );

      if (rpcError.code === "23505") {
        return fail(
          "你已經檢舉過這項商品",
          409
        );
      }

      if (
        rpcError.message.includes(
          "Product is not available"
        )
      ) {
        return fail(
          "商品已經被檢舉或下架，無法再次檢舉",
          409
        );
      }

      if (
        rpcError.message.includes(
          "Product not found"
        )
      ) {
        return fail("找不到商品", 404);
      }

      return fail(
        "檢舉送出失敗，請稍後再試",
        500
      );
    }

    // 9. 檢舉成功後，發送 LINE 通知給賣家
    // 等待通知嘗試完成，但不影響檢舉結果
    await notifySellerAboutReport(
      admin,
      product.line_user_id,
      product.name,
      reason
    );

    // 10. 回傳檢舉成功
    return NextResponse.json(
      {
        success: true,
        message:
          "檢舉成功，商品已暫時隱藏，等待管理員審核",
        reportId,
        productHidden: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "檢舉 API 發生錯誤:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "檢舉送出失敗";

    const authError =
      message.includes("驗證") ||
      message.includes("登入") ||
      message.includes("憑證") ||
      message.includes("LINE");

    return fail(
      authError
        ? message
        : "檢舉送出失敗，請稍後再試",
      authError ? 401 : 500
    );
  }
}
