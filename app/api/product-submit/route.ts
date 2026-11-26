
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { reviewProduct } from "@/lib/ai-review";
import { verifiedIdentity } from "@/lib/contact-auth";
import { verifyProductImageToken } from "@/lib/product-image-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ==========================================
// 商品分類
// ==========================================

const CATEGORIES = [
  "electronics",
  "books",
  "tools_stationery",
  "dorm_supplies",
  "hobbies",
  "cosmetics",
  "food",
  "clothing",
  "furniture",
  "sports",
  "other",
];

// ==========================================
// 商品新舊程度
// ==========================================

const CONDITIONS = [
  "new_sealed",
  "new_opened",
  "like_new",
  "good",
  "fair",
  "used",
];

const MAX_REQUEST_SIZE = 20000;

// ==========================================
// 統一錯誤回應
// ==========================================

function fail(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==========================================
// 驗證 UUID
// ==========================================

function validUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ==========================================
// 驗證私人 LINE 加好友連結
// ==========================================

function validLineUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "line.me" &&
      !url.port &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

// ==========================================
// 驗證新上傳的 Supabase 商品照片網址
// ==========================================

function validImageUrl(value: string): boolean {
  try {
    const base =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!base || value.length > 2000) {
      return false;
    }

    const url = new URL(value);
    const supabaseUrl = new URL(base);

    if (
      url.protocol !== "https:" ||
      url.origin !== supabaseUrl.origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return false;
    }

    const allowedPath =
      /^\/storage\/v1\/object\/public\/(product-images|products)\/products\/[a-zA-Z0-9_.-]+$/;

    return allowedPath.test(url.pathname);
  } catch {
    return false;
  }
}

// ==========================================
// 清理文字
// ==========================================

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

// ==========================================
// 商品新增及編輯 API
// ==========================================

async function submitProduct(
  req: NextRequest,
  isEditing: boolean
) {
  try {
    // 1. 驗證 LINE 與學校信箱

    let identity: Awaited<
      ReturnType<typeof verifiedIdentity>
    >;

    try {
      identity = await verifiedIdentity(req);
    } catch (error) {
      return fail(
        error instanceof Error
          ? error.message
          : "請先完成 LINE 登入及學校信箱驗證",
        401
      );
    }

    const {
      admin,
      email,
      lineUserId,
    } = identity;

    // 2. 驗證請求大小

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (contentLength > MAX_REQUEST_SIZE) {
      return fail("商品資料過大", 413);
    }

    const requestText = await req.text();

    if (
      Buffer.byteLength(
        requestText,
        "utf8"
      ) > MAX_REQUEST_SIZE
    ) {
      return fail("商品資料過大", 413);
    }

    // 3. 解析商品資料

    let body: Record<string, unknown>;

    try {
      const parsed = JSON.parse(requestText);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return fail("商品資料格式不正確");
      }

      body = parsed;
    } catch {
      return fail("商品資料格式不正確");
    }

    const productId = cleanText(body.productId);

    const name = cleanText(body.name);

    const category = cleanText(body.category);

    const condition = cleanText(body.condition);

    const description = cleanText(body.description);

    const imageUrl = cleanText(body.image_url);

    const imageToken = cleanText(body.imageToken);

    const price = body.price;

    // ======================================
    // 4. 驗證商品基本欄位
    // ======================================

    if (!name || name.length > 100) {
      return fail("商品名稱須為 1 至 100 字");
    }

    if (!CATEGORIES.includes(category)) {
      return fail("請選擇有效的商品分類");
    }

    if (!CONDITIONS.includes(condition)) {
      return fail("請選擇商品新舊程度");
    }

    if (
      typeof price !== "number" ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > 2147483647
    ) {
      return fail("請輸入有效的整數商品價格");
    }

    if (description.length > 2000) {
      return fail("商品詳情不得超過 2000 字");
    }

    // 此處只確認照片不為空
    // 不提前驗證舊商品圖片網址格式

    if (!imageUrl) {
      return fail("請先上傳商品照片");
    }

    if (
      isEditing &&
      !validUUID(productId)
    ) {
      return fail("商品 ID 格式不正確");
    }

    // ======================================
    // 5. 查詢既有商品
    // 優先驗證商品所有權
    // ======================================

    let existing: {
      id: string;
      status: string;
      ai_review_version: string;
      image_url: string | null;
    } | null = null;

    if (isEditing) {
      const {
        data,
        error: lookupError,
      } = await admin
        .from("products")
        .select(
          "id, status, ai_review_version, image_url"
        )
        .eq("id", productId)
        .eq("line_user_id", lineUserId)
        .eq("verified_email", email)
        .maybeSingle();

      if (lookupError) {
        console.error(
          "[Product Submit] 商品查詢失敗",
          lookupError.code
        );

        return fail(
          "無法讀取商品資料",
          500
        );
      }

      if (!data) {
        return fail(
          "商品不存在或你沒有編輯權限",
          404
        );
      }

      if (
        data.status !== "pending" &&
        data.status !== "approved"
      ) {
        return fail(
          "目前商品狀態不允許編輯，請聯絡管理員",
          409
        );
      }

      existing = data;
    }

    // ======================================
    // 6. 判斷是否保留原始商品照片
    // ======================================

    const keepingOriginalImage =
      isEditing &&
      existing !== null &&
      typeof existing.image_url === "string" &&
      existing.image_url.trim() !== "" &&
      existing.image_url.trim() === imageUrl;

    // 預設使用前端提交的新照片

    let finalImageUrl = imageUrl;

    // ======================================
    // 7. 驗證圖片所有權
    // ======================================

    if (keepingOriginalImage && existing) {
      // 編輯商品且未更換照片
      // 使用資料庫內原始照片網址
      // 不要求舊照片具備新版圖片憑證
      // 不套用新上傳照片的網址格式限制

      finalImageUrl = existing.image_url!;

      console.log(
        "[Product Submit] 保留原始商品照片",
        {
          productId,
          isEditing,
        }
      );
    } else {
      // 新增商品或更換照片
      // 必須通過完整網址驗證

      if (!validImageUrl(imageUrl)) {
        return fail(
          "商品照片網址不正確，請重新上傳照片"
        );
      }

      // 必須具有有效的圖片所有權憑證

      if (
        !imageToken ||
        !verifyProductImageToken(
          imageToken,
          imageUrl,
          lineUserId,
          email
        )
      ) {
        return fail(
          "商品照片驗證失敗或憑證已過期，請移除照片後重新上傳",
          403
        );
      }

      console.log(
        "[Product Submit] 新照片憑證驗證成功",
        {
          isEditing,
        }
      );
    }

    // ======================================
    // 8. 取得賣家私人 LINE 連結
    // ======================================

    const {
      data: sellerContact,
      error: contactError,
    } = await admin
      .from("seller_contacts")
      .select("line_friend_url")
      .eq("line_user_id", lineUserId)
      .eq("verified_email", email)
      .maybeSingle();

    if (contactError) {
      console.error(
        "[Product Submit] 聯絡資料查詢失敗",
        contactError.code
      );

      return fail(
        "無法讀取賣家聯絡資料",
        500
      );
    }

    const sellerLineUrl = cleanText(
      sellerContact?.line_friend_url
    );

    if (
      !sellerLineUrl ||
      sellerLineUrl.length > 500 ||
      !validLineUrl(sellerLineUrl)
    ) {
      return fail(
        "尚未設定有效的私人 LINE 加好友連結，請前往個人中心設定"
      );
    }

    // ======================================
    // 9. 由後端建立商品資料
    // ======================================

    const payload = {
      name,

      category,

      condition,

      price,

      description,

      // 使用後端確認的商品照片

      image_url: finalImageUrl,

      contact: sellerLineUrl,

      // 使用官方驗證後的身分

      line_user_id: lineUserId,

      verified_email: email,

      // 商品一律重新進入待審核

      status: "pending",

      is_approved: false,

      approved_at: null,

      // 初始化 AI 審核狀態

      ai_review_status: "pending",

      ai_review_reason: null,

      ai_risk_level: null,

      ai_review_flags: [],

      ai_reviewed_at: null,

      ai_review_model: null,

      // 建立新的 AI 審核版本

      ai_review_version: randomUUID(),
    };

    let savedProductId: string;

    // ======================================
    // 10. 編輯既有商品
    // ======================================

    if (isEditing) {
      if (!existing) {
        return fail(
          "找不到要編輯的商品",
          404
        );
      }

      let updateQuery = admin
        .from("products")
        .update(payload)
        .eq("id", productId)
        .eq("line_user_id", lineUserId)
        .eq("verified_email", email)
        .eq("status", existing.status)
        .eq(
          "ai_review_version",
          existing.ai_review_version
        );

      // 確認原始圖片未被其他操作修改

      if (existing.image_url === null) {
        updateQuery = updateQuery.is(
          "image_url",
          null
        );
      } else {
        updateQuery = updateQuery.eq(
          "image_url",
          existing.image_url
        );
      }

      const {
        data,
        error,
      } = await updateQuery
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(
          "[Product Submit] 商品更新失敗",
          error.code
        );

        return fail(
          "商品更新失敗",
          500
        );
      }

      if (!data) {
        return fail(
          "商品狀態已變更，請重新整理後再試",
          409
        );
      }

      savedProductId = data.id;
    } else {
      // ====================================
      // 11. 新增商品
      // ====================================

      const {
        data,
        error,
      } = await admin
        .from("products")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        console.error(
          "[Product Submit] 商品新增失敗",
          error?.code
        );

        return fail(
          "商品新增失敗",
          500
        );
      }

      savedProductId = data.id;
    }

    // ======================================
    // 12. 商品儲存完成
    // ======================================

    console.log(
      "[Product Submit] 商品儲存成功",
      {
        productId: savedProductId,
        isEditing,
        keepingOriginalImage,
        aiReviewStatus: "pending",
      }
    );

    // AI 審核：預設人工審核，明確啟用才自動上架。
    let finalStatus = "pending";
    let finalReviewStatus = "pending";
    try {
      const result = await reviewProduct({
        id: savedProductId, name, category, condition, price,
        description, image_url: finalImageUrl,
      });
      const approved = process.env.AI_AUTO_APPROVE === "true" &&
        result.status === "passed" && result.riskLevel === "low" &&
        result.flags.length === 0;
      const reviewStatus = result.status === "passed" && !approved
        ? "manual_review" : result.status;
      const { data, error } = await admin.from("products").update({
        ai_review_status: reviewStatus,
        ai_review_reason: result.reason,
        ai_risk_level: result.riskLevel,
        ai_review_flags: result.flags,
        ai_review_model: result.model,
        ai_reviewed_at: result.reviewedAt,
        status: approved ? "approved" : "pending",
        is_approved: approved,
        approved_at: approved ? new Date().toISOString() : null,
      }).eq("id", savedProductId)
        .eq("line_user_id", lineUserId)
        .eq("verified_email", email)
        .eq("status", "pending")
        .eq("ai_review_status", "pending")
        .eq("ai_review_version", payload.ai_review_version)
        .select("id").maybeSingle();
      if (!error && data) {
        finalStatus = approved ? "approved" : "pending";
        finalReviewStatus = reviewStatus;
      } else {
        console.warn("[Product Submit] AI result not applied", error?.code);
      }
    } catch {
      console.warn("[Product Submit] AI review unavailable; manual review retained");
    }

    return NextResponse.json(
      {
        success: true,

        productId: savedProductId,

        status: finalStatus,

        aiReviewStatus: finalReviewStatus,

        message: finalStatus === "approved" ? "商品審核通過，已上架" : isEditing
          ? "商品修改成功，已重新送出審核"
          : "商品刊登成功，已送出審核",
      },
      {
        status: isEditing ? 200 : 201,

        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    console.error(
      "[Product Submit] 系統處理失敗"
    );

    return fail(
      "商品儲存發生錯誤，請稍後再試",
      500
    );
  }
}

// ==========================================
// POST：新增商品
// ==========================================

export async function POST(
  req: NextRequest
) {
  return submitProduct(req, false);
}

// ==========================================
// PUT：編輯商品
// ==========================================

export async function PUT(
  req: NextRequest
) {
  return submitProduct(req, true);
}
