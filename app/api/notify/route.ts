
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  line_user_id: string | null;
  status: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function getStatus(product: Product): string {
  return product.status || "pending";
}

function getNotificationContent(status: string) {
  switch (status) {
    case "approved":
      return {
        title: "🎉 商品審核通過！已成功上架",
        color: "#10B981",
        message:
          "恭喜！您的二手寶貝已經通過管理員審核，現在已經在平台上公開展示，祝您順利成交！",
        footer: "請留意買家的 LINE 訊息與好友申請。",
      };

    case "rejected":
      return {
        title: "⚠️ 商品未通過審核",
        color: "#EF4444",
        message:
          "您的商品目前未通過審核，請前往「我的刊登」查看商品狀態，確認是否需要修改內容。",
        footer: "修改完成後，可依平台流程重新送出審核。",
      };

    case "pending":
      return {
        title: "⏳ 商品已送出審核",
        color: "#D35400",
        message:
          "您的二手寶貝已成功送出審核，目前正在等待管理員審核。審核通過後，商品就會公開顯示在平台上。",
        footer: "請稍後至「我的刊登」查看最新狀態。",
      };

    default:
      return null;
  }
}

function getImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function createFlexMessage(product: Product) {
  const status = getStatus(product);
  const content = getNotificationContent(status);

  if (!content) return null;

  const price = Number(product.price || 0);
  const displayPrice = Number.isFinite(price)
    ? price.toLocaleString("zh-TW")
    : "0";

  const imageUrl = getImageUrl(product.image_url);

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

export async function POST(req: NextRequest) {
  try {
    // 驗證 Supabase Webhook 密鑰
    const webhookSecret = process.env.NOTIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("缺少 NOTIFY_WEBHOOK_SECRET");
      return jsonError("通知服務尚未設定", 500);
    }

    const suppliedSecret = req.headers.get("x-notify-secret");

    if (suppliedSecret !== webhookSecret) {
      console.error("Webhook 密鑰不符合");
      return jsonError("未授權的通知請求", 401);
    }

    // 取得伺服器環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const channelAccessToken =
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!supabaseUrl || !serviceRoleKey || !channelAccessToken) {
      console.error("通知服務缺少必要環境變數");
      return jsonError("通知服務設定不完整", 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = await req.json();

    // Supabase Database Webhook 事件
    const eventType = String(body.type || "").toUpperCase();

    if (!["INSERT", "UPDATE"].includes(eventType)) {
      return NextResponse.json({
        success: true,
        skipped: "不需要發送通知的事件",
      });
    }

    const record = body.record;
    const oldRecord = body.old_record;

    if (!record?.id || typeof record.id !== "string") {
      return jsonError("缺少商品 ID", 400);
    }

    // 讀取資料庫中的正式商品資料
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, price, image_url, line_user_id, status")
      .eq("id", record.id)
      .single();

    if (productError || !product) {
      console.error("讀取商品失敗:", productError);
      return jsonError("無法取得商品資料", 404);
    }

    const status = getStatus(product as Product);

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({
        success: true,
        skipped: "此狀態不需要通知",
      });
    }

    // 更新商品時，只有審核狀態改變才發通知
    if (eventType === "UPDATE") {
      const previousStatus = oldRecord?.status;

      if (!oldRecord || previousStatus === status) {
        return NextResponse.json({
          success: true,
          skipped: "商品審核狀態沒有變更",
        });
      }
    }

    const sellerLoginId = product.line_user_id;

    if (!sellerLoginId) {
      return NextResponse.json({
        success: true,
        skipped: "商品沒有賣家 LINE ID",
      });
    }

    // 查詢 LINE Login 與 Messaging API 帳號對應
    // 已依照 Supabase 實際欄位修正
    const { data: binding, error: bindingError } = await admin
      .from("line_notification_bindings")
      .select("messaging_user_id")
      .eq("line_login_user_id", sellerLoginId)
      .maybeSingle();

    if (bindingError) {
      console.error("查詢 LINE 綁定失敗:", {
        code: bindingError.code,
        message: bindingError.message,
        details: bindingError.details,
        hint: bindingError.hint,
      });

      return jsonError("無法確認通知收件人", 500);
    }

    // 有綁定紀錄時使用 Messaging API User ID
    // 無綁定紀錄時保留舊版 LINE ID 相容方式
    const recipientLineId =
      binding?.messaging_user_id || sellerLoginId;

    const flexMessage = createFlexMessage(product as Product);

    if (!flexMessage) {
      return NextResponse.json({
        success: true,
        skipped: "不支援的通知狀態",
      });
    }

    // 發送 LINE 官方帳號 Flex Message
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("LINE 推播失敗:", {
        statusCode: response.status,
        details: errorText,
      });

      return jsonError("LINE 推播失敗", 502);
    }

    console.log("LINE 商品審核通知已提交:", {
      productId: product.id,
      status,
      eventType,
      recipientSource: binding?.messaging_user_id
        ? "line_notification_bindings"
        : "product.line_user_id",
    });

    return NextResponse.json({
      success: true,
      productId: product.id,
      status,
      message: "LINE 通知已提交",
    });
  } catch (error) {
    console.error("商品審核通知發生錯誤:", error);
    return jsonError("通知服務發生錯誤", 500);
  }
}
