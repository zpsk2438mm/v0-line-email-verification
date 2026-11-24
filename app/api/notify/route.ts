
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  matchProductAndNotify,
  type MatchingProduct,
} from "@/lib/product-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Product = MatchingProduct;

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function getStatus(product: Product): string {
  return product.status || "pending";
}

// ==========================================
// 原本的商品審核通知內容
// ==========================================

function getNotificationContent(status: string) {
  switch (status) {
    case "approved":
      return {
        title: "🎉 商品審核通過！已成功上架",
        color: "#10B981",
        message:
          "恭喜！您的二手寶貝已經通過管理員審核，現在已經在平台上公開展示，祝您順利成交！",
        footer:
          "請留意買家的 LINE 訊息與好友申請。",
      };

    case "rejected":
      return {
        title: "⚠️ 商品未通過審核",
        color: "#EF4444",
        message:
          "您的商品目前未通過審核，請前往「我的刊登」查看商品狀態，確認是否需要修改內容。",
        footer:
          "修改完成後，可依平台流程重新送出審核。",
      };

    case "pending":
      return {
        title: "⏳ 商品已送出審核",
        color: "#D35400",
        message:
          "您的二手寶貝已成功送出審核，目前正在等待管理員審核。審核通過後，商品就會公開顯示在平台上。",
        footer:
          "請稍後至「我的刊登」查看最新狀態。",
      };

    case "removed":
      return {
        title: "🚫 商品違規下架通知",
        color: "#DC2626",
        message:
          "您的商品經管理員審核後，已被判定不符合平台規範，目前已正式下架並停止公開展示。",
        footer:
          "請至「我的商品」查看最新狀態。如有疑問，請聯繫平台管理員。",
      };

    default:
      return null;
  }
}

// ==========================================
// 驗證商品圖片
// ==========================================

function getImageUrl(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  try {
    const url = new URL(cleaned);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

// ==========================================
// 原本的賣家通知 Flex Message
// ==========================================

function createFlexMessage(product: Product) {
  const status = getStatus(product);

  const content = getNotificationContent(
    status
  );

  if (!content) {
    return null;
  }

  const price = Number(product.price || 0);

  const displayPrice = Number.isFinite(price)
    ? price.toLocaleString("zh-TW")
    : "0";

  const imageUrl = getImageUrl(
    product.image_url
  );

  const bubble: any = {
    type: "bubble",

    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "lg",
      spacing: "md",

      contents: [
        {
          type: "text",
          text: content.title,
          weight: "bold",
          color: content.color,
          size: "md",
          wrap: true,
        },
        {
          type: "text",
          text: product.name || "未命名商品",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "xs",

          contents: [
            {
              type: "text",
              text: "預售價格：",
              size: "sm",
              color: "#666666",
              flex: 0,
            },
            {
              type: "text",
              text: `NT$ ${displayPrice}`,
              weight: "bold",
              size: "md",
              color: "#D35400",
              flex: 1,
            },
          ],
        },
        {
          type: "text",
          text: content.message,
          color: "#444444",
          size: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: content.footer,
          size: "xs",
          color: "#777777",
          wrap: true,
        },
        {
          type: "separator",
          color: "#E5E5E5",
          margin: "md",
        },
        {
          type: "text",
          text: "📍 南臺二手市集 · 自動通知系統",
          size: "xs",
          color: "#A0A0A0",
          wrap: true,
        },
      ],
    },
  };

  if (imageUrl) {
    bubble.hero = {
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "16:9",
      aspectMode: "cover",
    };
  }

  return {
    type: "flex",
    altText: content.title,
    contents: bubble,
  };
}

// ==========================================
// Supabase Webhook 通知入口
// ==========================================

export async function POST(req: NextRequest) {
  try {
    // 驗證 Supabase Webhook 密鑰

    const webhookSecret =
      process.env.NOTIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "缺少 NOTIFY_WEBHOOK_SECRET"
      );

      return jsonError(
        "通知服務尚未設定",
        500
      );
    }

    const suppliedSecret = req.headers.get(
      "x-notify-secret"
    );

    if (suppliedSecret !== webhookSecret) {
      console.error(
        "Webhook 密鑰不符合"
      );

      return jsonError(
        "未授權的通知請求",
        401
      );
    }

    // 取得伺服器環境變數

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const channelAccessToken =
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !channelAccessToken
    ) {
      console.error(
        "通知服務缺少必要環境變數"
      );

      return jsonError(
        "通知服務設定不完整",
        500
      );
    }

    // 取得正式網站網址

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      req.nextUrl.origin;

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const body = await req.json();

    // Supabase Database Webhook 事件

    const eventType = String(
      body.type || ""
    ).toUpperCase();

    if (
      !["INSERT", "UPDATE"].includes(eventType)
    ) {
      return NextResponse.json({
        success: true,
        skipped: "不需要發送通知的事件",
      });
    }

    const record = body.record;
    const oldRecord = body.old_record;

    if (
      !record?.id ||
      typeof record.id !== "string"
    ) {
      return jsonError(
        "缺少商品 ID",
        400
      );
    }

    // 讀取正式商品資料
    // 新增 description、is_approved

    const { data, error: productError } =
      await admin
        .from("products")
        .select(
          "id, name, description, price, image_url, line_user_id, status, is_approved"
        )
        .eq("id", record.id)
        .single();

    if (productError || !data) {
      console.error(
        "讀取商品失敗:",
        productError
      );

      return jsonError(
        "無法取得商品資料",
        404
      );
    }

    const product = data as Product;

    const status = getStatus(product);

    // 確認通知狀態

    if (
      ![
        "pending",
        "approved",
        "rejected",
        "removed",
      ].includes(status)
    ) {
      return NextResponse.json({
        success: true,
        skipped: "此狀態不需要通知",
      });
    }

    // 避免延遲 Webhook 通知舊商品狀態

    if (
      (record.status || "pending") !== status
    ) {
      return NextResponse.json({
        success: true,
        skipped: "商品狀態已變更，略過舊事件",
      });
    }

    // 是否需要發送賣家審核通知

    const shouldNotifySeller =
      eventType === "INSERT" ||
      (
        eventType === "UPDATE" &&
        Boolean(oldRecord) &&
        oldRecord.status !== status
      );

    // 是否需要執行智慧媒合

    const isPublicProduct =
      status === "approved" &&
      product.is_approved === true;

    const wasPublicProduct =
      oldRecord?.status === "approved" &&
      oldRecord?.is_approved === true;

    const shouldMatch =
      isPublicProduct &&
      record.is_approved === true &&
      (
        eventType === "INSERT" ||
        (
          eventType === "UPDATE" &&
          Boolean(oldRecord) &&
          !wasPublicProduct
        )
      );

    if (
      !shouldNotifySeller &&
      !shouldMatch
    ) {
      return NextResponse.json({
        success: true,
        skipped: "商品審核狀態沒有變更",
      });
    }

    // ======================================
    // 賣家審核通知
    // ======================================

    async function notifySeller() {
      if (!shouldNotifySeller) {
        return {
          success: true,
          skipped: "不需要賣家審核通知",
        };
      }

      const sellerLoginId =
        product.line_user_id;

      if (!sellerLoginId) {
        return {
          success: true,
          skipped: "商品沒有賣家 LINE ID",
        };
      }

      const {
        data: binding,
        error: bindingError,
      } = await admin
        .from("line_notification_bindings")
        .select("messaging_user_id")
        .eq(
          "line_login_user_id",
          sellerLoginId
        )
        .maybeSingle();

      if (bindingError) {
        console.error(
          "查詢 LINE 綁定失敗:",
          {
            code: bindingError.code,
            message: bindingError.message,
            details: bindingError.details,
            hint: bindingError.hint,
          }
        );

        throw new Error(
          "無法確認通知收件人"
        );
      }

      // 保留原本的 LINE ID 相容方式

      const recipientLineId =
        binding?.messaging_user_id ||
        sellerLoginId;

      const flexMessage =
        createFlexMessage(product);

      if (!flexMessage) {
        return {
          success: true,
          skipped: "不支援的通知狀態",
        };
      }

      const response = await fetch(
        "https://api.line.me/v2/bot/message/push",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${channelAccessToken}`,
          },

          body: JSON.stringify({
            to: recipientLineId,
            messages: [flexMessage],
          }),

          signal: AbortSignal.timeout(8000),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "LINE 推播失敗:",
          {
            statusCode: response.status,
            details: errorText,
          }
        );

        throw new Error("LINE 推播失敗");
      }

      console.log(
        "LINE 商品審核通知已提交:",
        {
          productId: product.id,
          status,
          eventType,

          recipientSource:
            binding?.messaging_user_id
              ? "line_notification_bindings"
              : "product.line_user_id",
        }
      );

      return {
        success: true,
        message: "LINE 賣家通知已提交",
      };
    }

    // ======================================
    // 買家智慧媒合通知
    // ======================================

    async function notifyMatchedBuyers() {
      if (!shouldMatch) {
        return {
          matchedUsers: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
        };
      }

      return matchProductAndNotify(
        admin,
        product,
        channelAccessToken!,
        siteUrl
      );
    }

    // ======================================
    // 分開執行兩種通知
    // 避免其中一個失敗影響另一個
    // ======================================

    const [
      sellerResult,
      matchingResult,
    ] = await Promise.allSettled([
      notifySeller(),
      notifyMatchedBuyers(),
    ]);

    if (
      sellerResult.status === "rejected"
    ) {
      console.error(
        "[Notify] 賣家通知失敗:",
        sellerResult.reason
      );
    }

    if (
      matchingResult.status === "rejected"
    ) {
      console.error(
        "[Notify] 智慧媒合失敗:",
        matchingResult.reason
      );
    }

    const sellerNotification =
      sellerResult.status === "fulfilled"
        ? sellerResult.value
        : {
            success: false,
            error: "賣家通知失敗",
          };

    const matchingNotification =
      matchingResult.status === "fulfilled"
        ? matchingResult.value
        : {
            matchedUsers: 0,
            sent: 0,
            skipped: 0,
            failed: 1,
          };

    const allSucceeded =
      sellerResult.status === "fulfilled" &&
      matchingResult.status === "fulfilled" &&
      matchingNotification.failed === 0;

    return NextResponse.json(
      {
        success: allSucceeded,
        productId: product.id,
        status,

        sellerNotification,
        matchingNotification,

        message: allSucceeded
          ? "LINE 通知處理完成"
          : "部分 LINE 通知處理失敗",
      },
      {
        status: allSucceeded ? 200 : 502,
      }
    );
  } catch (error) {
    console.error(
      "商品審核通知發生錯誤:",
      error
    );

    return jsonError(
      "通知服務發生錯誤",
      500
    );
  }
}
