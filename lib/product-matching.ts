
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MatchingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  line_user_id: string | null;
  status: string | null;
  is_approved: boolean | null;
}

interface KeywordAlert {
  id: string;
  line_user_id: string;
  keyword: string;
  is_active: boolean;
}

interface MatchingResult {
  matchedUsers: number;
  sent: number;
  skipped: number;
  failed: number;
}

const LINE_PUSH_URL =
  "https://api.line.me/v2/bot/message/push";

const PAGE_SIZE = 500;

// ==========================================
// 關鍵字標準化
// ==========================================

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim();
}

// ==========================================
// 驗證商品圖片
// ==========================================

function getImageUrl(value: unknown): string | null {
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
// 建立商品詳細頁面連結
// ==========================================

function getProductUrl(
  productId: string,
  siteUrl: string
): string {
  const url = new URL(
    `/products/${encodeURIComponent(productId)}`,
    siteUrl
  );

  if (url.protocol !== "https:") {
    throw new Error("商品網址必須使用 HTTPS");
  }

  return url.toString();
}

// ==========================================
// 建立 LINE 智慧媒合 Flex Message
// ==========================================

function createMatchingFlexMessage(
  product: MatchingProduct,
  keywords: string[],
  siteUrl: string
) {
  const price = Number(product.price || 0);

  const displayPrice = Number.isFinite(price)
    ? price.toLocaleString("zh-TW")
    : "0";

  const imageUrl = getImageUrl(product.image_url);

  const productUrl = getProductUrl(
    product.id,
    siteUrl
  );

  const bubble: any = {
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
          text: "🎯 智慧媒合成功通知",
          weight: "bold",
          size: "lg",
          color: "#D35400",
          wrap: true,
        },
        {
          type: "text",
          text: product.name || "未命名商品",
          weight: "bold",
          size: "xl",
          color: "#222222",
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
              text: "符合追蹤關鍵字",
              size: "xs",
              color: "#888888",
            },
            {
              type: "text",
              text: keywords.join("、"),
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
              text: "商品狀態",
              size: "xs",
              color: "#888888",
            },
            {
              type: "text",
              text: "已公開上架",
              size: "sm",
              weight: "bold",
              color: "#10B981",
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
                "您所追蹤的關鍵字已有符合條件的商品上架，趕快前往市集查看吧！",
              size: "sm",
              color: "#555555",
              wrap: true,
            },
          ],
        },
      ],
    },

    footer: {
      type: "box",
      layout: "vertical",
      spacing: "md",

      contents: [
        {
          type: "button",
          style: "primary",
          color: "#D35400",
          height: "sm",

          action: {
            type: "uri",
            label: "查看商品",
            uri: productUrl,
          },
        },
        {
          type: "separator",
          color: "#EEEEEE",
        },
        {
          type: "text",
          text: "📍 南臺二手市集 · 智慧媒合系統",
          size: "xs",
          color: "#999999",
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
    altText: "🎯 您追蹤的商品已成功媒合！",
    contents: bubble,
  };
}

// ==========================================
// 分頁讀取所有啟用中的關鍵字
// ==========================================

async function loadActiveKeywords(
  admin: SupabaseClient
): Promise<KeywordAlert[]> {
  const alerts: KeywordAlert[] = [];

  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from("keyword_alerts")
      .select("id, line_user_id, keyword, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(
        "[Product Matching] 關鍵字查詢失敗:",
        error
      );

      throw new Error("無法讀取媒合關鍵字");
    }

    const rows = (data || []) as KeywordAlert[];

    alerts.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return alerts;
}

// ==========================================
// 更新通知紀錄
// ==========================================

async function updateNotificationLog(
  admin: SupabaseClient,
  logId: string,
  values: Record<string, unknown>
) {
  const { error } = await admin
    .from("match_notification_logs")
    .update(values)
    .eq("id", logId);

  if (error) {
    console.error(
      "[Product Matching] 更新通知紀錄失敗:",
      error
    );

    throw new Error("無法更新媒合通知紀錄");
  }
}

// ==========================================
// 發送單一使用者媒合通知
// ==========================================

async function notifyMatchedUser(
  admin: SupabaseClient,
  product: MatchingProduct,
  lineUserId: string,
  keywords: string[],
  channelAccessToken: string,
  siteUrl: string
): Promise<"sent" | "skipped" | "failed"> {
  let logId: string | null = null;

  try {
    // 查詢使用者 LINE 通知綁定

    const { data: binding, error: bindingError } =
      await admin
        .from("line_notification_bindings")
        .select("messaging_user_id")
        .eq("line_login_user_id", lineUserId)
        .maybeSingle();

    if (bindingError) {
      throw new Error("無法取得 LINE 通知綁定");
    }

    if (!binding?.messaging_user_id) {
      return "skipped";
    }

    // 再次確認關鍵字仍處於啟用狀態

    const { data: currentAlerts, error: alertError } =
      await admin
        .from("keyword_alerts")
        .select("keyword")
        .eq("line_user_id", lineUserId)
        .eq("is_active", true);

    if (alertError) {
      throw new Error("無法確認關鍵字通知狀態");
    }

    const enabledKeywords = new Set(
      (currentAlerts || []).map((item) =>
        normalizeText(item.keyword)
      )
    );

    const validKeywords = keywords.filter(
      (keyword) =>
        enabledKeywords.has(normalizeText(keyword))
    );

    if (validKeywords.length === 0) {
      return "skipped";
    }

    // 再次確認商品仍然公開

    const { data: currentProduct, error: productError } =
      await admin
        .from("products")
        .select(
          "id, name, description, price, image_url, line_user_id, status, is_approved"
        )
        .eq("id", product.id)
        .maybeSingle();

    if (productError) {
      throw new Error("無法確認商品狀態");
    }

    if (
      !currentProduct ||
      currentProduct.status !== "approved" ||
      currentProduct.is_approved !== true ||
      currentProduct.line_user_id === lineUserId
    ) {
      return "skipped";
    }

    const latestProduct =
      currentProduct as MatchingProduct;

    const latestName = normalizeText(
      latestProduct.name
    );

    const latestDescription = normalizeText(
      latestProduct.description
    );

    const finalKeywords = validKeywords.filter(
      (keyword) => {
        const normalized = normalizeText(keyword);

        return (
          normalized.length > 0 &&
          (
            latestName.includes(normalized) ||
            latestDescription.includes(normalized)
          )
        );
      }
    );

    if (finalKeywords.length === 0) {
      return "skipped";
    }

    const flexMessage = createMatchingFlexMessage(
      latestProduct,
      finalKeywords,
      siteUrl
    );

    // 建立唯一通知紀錄
    // 相同商品與使用者不可重複建立

    const { error: insertError } = await admin
      .from("match_notification_logs")
      .upsert(
        {
          product_id: product.id,
          line_user_id: lineUserId,
          matched_keywords: finalKeywords,
          status: "pending",
        },
        {
          onConflict: "product_id,line_user_id",
          ignoreDuplicates: true,
        }
      );

    if (insertError) {
      throw new Error("無法建立媒合通知紀錄");
    }

    // 取得通知紀錄

    const { data: log, error: logError } =
      await admin
        .from("match_notification_logs")
        .select(
          "id, status, retry_key, attempt_count, updated_at"
        )
        .eq("product_id", product.id)
        .eq("line_user_id", lineUserId)
        .single();

    if (logError || !log) {
      throw new Error("無法取得媒合通知紀錄");
    }

    // 已發送成功，不重複推播

    if (log.status === "sent") {
      return "skipped";
    }

    // 正在處理中的通知不重複執行

    if (log.status === "sending") {
      return "skipped";
    }

    // 限制最多三次嘗試

    if (Number(log.attempt_count || 0) >= 3) {
      return "skipped";
    }

    // 原子更新，避免同時發送

    const { data: claimed, error: claimError } =
      await admin
        .from("match_notification_logs")
        .update({
          status: "sending",
          attempt_count:
            Number(log.attempt_count || 0) + 1,
          matched_keywords: finalKeywords,
          error_message: null,
        })
        .eq("id", log.id)
        .eq("status", log.status)
        .eq("attempt_count", log.attempt_count)
        .select("id, retry_key")
        .maybeSingle();

    if (claimError) {
      throw new Error("無法鎖定媒合通知紀錄");
    }

    if (!claimed) {
      return "skipped";
    }

    logId = claimed.id;

    // 發送 LINE Flex Message

    const response = await fetch(
      LINE_PUSH_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelAccessToken}`,
          "X-Line-Retry-Key": claimed.retry_key,
        },

        body: JSON.stringify({
          to: binding.messaging_user_id,
          messages: [flexMessage],
        }),

        signal: AbortSignal.timeout(8000),
      }
    );

    // LINE 409 且有 accepted request ID
    // 表示相同 Retry Key 已被接受

    const alreadyAccepted =
      response.status === 409 &&
      Boolean(
        response.headers.get(
          "x-line-accepted-request-id"
        )
      );

    if (!response.ok && !alreadyAccepted) {
      const errorText = await response.text();

      throw new Error(
        `LINE HTTP ${response.status}: ${errorText}`
      );
    }

    // 更新通知成功紀錄

    await updateNotificationLog(
      admin,
      claimed.id,
      {
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
      }
    );

    console.log(
      "[Product Matching] 媒合通知已提交:",
      {
        productId: product.id,
        matchedKeywords: finalKeywords,
      }
    );

    return "sent";
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "未知媒合通知錯誤";

    console.error(
      "[Product Matching] 媒合通知失敗:",
      {
        productId: product.id,
        message,
      }
    );

    if (logId) {
      try {
        await updateNotificationLog(
          admin,
          logId,
          {
            status: "failed",
            error_message: message.slice(0, 1000),
          }
        );
      } catch (updateError) {
        console.error(
          "[Product Matching] 紀錄失敗狀態時發生錯誤:",
          updateError
        );
      }
    }

    return "failed";
  }
}

// ==========================================
// 智慧媒合主要函式
// ==========================================

export async function matchProductAndNotify(
  admin: SupabaseClient,
  product: MatchingProduct,
  channelAccessToken: string,
  siteUrl: string
): Promise<MatchingResult> {
  const result: MatchingResult = {
    matchedUsers: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  // 只允許正式公開上架商品

  if (
    product.status !== "approved" ||
    product.is_approved !== true
  ) {
    return result;
  }

  const productName = normalizeText(
    product.name
  );

  const productDescription = normalizeText(
    product.description
  );

  const alerts = await loadActiveKeywords(admin);

  // 將同一位使用者的符合關鍵字合併

  const matchedUsers =
    new Map<string, Set<string>>();

  for (const alert of alerts) {
    if (
      !alert.is_active ||
      !alert.line_user_id ||
      alert.line_user_id === product.line_user_id
    ) {
      continue;
    }

    const keyword = normalizeText(
      alert.keyword
    );

    if (!keyword) {
      continue;
    }

    const matched =
      productName.includes(keyword) ||
      productDescription.includes(keyword);

    if (!matched) {
      continue;
    }

    if (!matchedUsers.has(alert.line_user_id)) {
      matchedUsers.set(
        alert.line_user_id,
        new Set<string>()
      );
    }

    matchedUsers
      .get(alert.line_user_id)!
      .add(alert.keyword.trim());
  }

  result.matchedUsers = matchedUsers.size;

  console.log(
    "[Product Matching] 關鍵字比對完成:",
    {
      productId: product.id,
      activeKeywords: alerts.length,
      matchedUsers: matchedUsers.size,
    }
  );

  // 每批最多同時處理五位使用者

  const users = Array.from(
    matchedUsers.entries()
  );

  const BATCH_SIZE = 5;

  for (
    let index = 0;
    index < users.length;
    index += BATCH_SIZE
  ) {
    const batch = users.slice(
      index,
      index + BATCH_SIZE
    );

    const responses = await Promise.allSettled(
      batch.map(([lineUserId, keywords]) =>
        notifyMatchedUser(
          admin,
          product,
          lineUserId,
          Array.from(keywords),
          channelAccessToken,
          siteUrl
        )
      )
    );

    for (const response of responses) {
      if (response.status === "rejected") {
        result.failed += 1;
        continue;
      }

      if (response.value === "sent") {
        result.sent += 1;
      } else if (response.value === "skipped") {
        result.skipped += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  console.log(
    "[Product Matching] 智慧媒合處理完成:",
    {
      productId: product.id,
      ...result,
    }
  );

  return result;
}
