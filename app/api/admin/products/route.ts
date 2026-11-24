
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ==========================================
// 管理員 LINE ID
// 與現有管理員後台及檢舉 API 保持一致
// ==========================================

const ADMIN_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_REQUEST_SIZE = 10000;

// ==========================================
// 統一 API 回應
// ==========================================

function fail(
  message: string,
  status = 400
) {
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

function success(
  data: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==========================================
// 驗證管理員身分
// ==========================================

async function verifyAdmin(
  req: NextRequest
) {
  const identity =
    await verifiedIdentity(req);

  if (
    !ADMIN_IDS.includes(
      identity.lineUserId
    )
  ) {
    return null;
  }

  return identity;
}

// ==========================================
// GET：讀取待審核商品
// ==========================================

export async function GET(
  req: NextRequest
) {
  let identity;

  try {
    identity = await verifyAdmin(req);
  } catch (error: unknown) {
    return fail(
      error instanceof Error
        ? error.message
        : "請重新登入並完成身分驗證",
      401
    );
  }

  if (!identity) {
    return fail(
      "你沒有管理員權限",
      403
    );
  }

  const { admin } = identity;

  try {
    // 只讀取待審核商品
    // 不回傳賣家信箱及私人聯絡連結

    const { data, error } = await admin
      .from("products")
      .select(`
        id,
        name,
        price,
        category,
        condition,
        description,
        image_url,
        status,
        is_approved,
        created_at,
        approved_at,
        ai_review_status,
        ai_review_reason,
        ai_risk_level,
        ai_review_flags,
        ai_reviewed_at,
        ai_review_model,
        ai_review_version
      `)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (error) {
      console.error(
        "[Admin Products] 讀取商品失敗:",
        error.code,
        error.message
      );

      return fail(
        "讀取待審核商品失敗",
        500
      );
    }

    const products = data || [];

    // AI 審核統計
    const stats = {
      total: products.length,

      pending: products.filter(
        (product) =>
          product.ai_review_status === "pending"
      ).length,

      reviewing: products.filter(
        (product) =>
          product.ai_review_status === "reviewing"
      ).length,

      passed: products.filter(
        (product) =>
          product.ai_review_status === "passed"
      ).length,

      manualReview: products.filter(
        (product) =>
          product.ai_review_status === "manual_review"
      ).length,

      failed: products.filter(
        (product) =>
          product.ai_review_status === "failed"
      ).length,

      notReviewed: products.filter(
        (product) =>
          product.ai_review_status === "not_reviewed"
      ).length,

      highRisk: products.filter(
        (product) =>
          product.ai_risk_level === "high"
      ).length,
    };

    return success({
      products,
      stats,
    });
  } catch {
    console.error(
      "[Admin Products] 讀取商品發生異常"
    );

    return fail(
      "讀取商品失敗，請稍後再試",
      500
    );
  }
}

// ==========================================
// POST：管理員人工審核商品
// ==========================================

export async function POST(
  req: NextRequest
) {
  let identity;

  try {
    identity = await verifyAdmin(req);
  } catch (error: unknown) {
    return fail(
      error instanceof Error
        ? error.message
        : "請重新登入並完成身分驗證",
      401
    );
  }

  if (!identity) {
    return fail(
      "你沒有管理員權限",
      403
    );
  }

  const { admin } = identity;

  try {
    // ======================================
    // 1. 驗證請求大小
    // ======================================

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      return fail("資料過大", 413);
    }

    const raw = await req.text();

    if (
      Buffer.byteLength(raw, "utf8") >
      MAX_REQUEST_SIZE
    ) {
      return fail("資料過大", 413);
    }

    // ======================================
    // 2. 解析 JSON
    // ======================================

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail(
        "資料格式不正確"
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail(
        "請提供有效的商品審核資料"
      );
    }

    const input = body as Record<
      string,
      unknown
    >;

    const productId =
      typeof input.productId === "string"
        ? input.productId.trim()
        : "";

    const action =
      typeof input.action === "string"
        ? input.action.trim()
        : "";

    const reviewVersion =
      typeof input.reviewVersion === "string"
        ? input.reviewVersion.trim()
        : "";

    // ======================================
    // 3. 驗證商品 ID
    // ======================================

    if (
      !UUID_PATTERN.test(productId)
    ) {
      return fail(
        "商品 ID 格式不正確"
      );
    }

    // ======================================
    // 4. 驗證審核版本
    // ======================================

    if (
      !UUID_PATTERN.test(reviewVersion)
    ) {
      return fail(
        "商品審核版本不正確，請重新整理",
        400
      );
    }

    // ======================================
    // 5. 驗證管理員操作
    // ======================================

    if (
      action !== "approve" &&
      action !== "reject"
    ) {
      return fail(
        "無效的商品審核操作"
      );
    }

    // ======================================
    // 6. 確認商品目前狀態
    // ======================================

    const {
      data: product,
      error: productError,
    } = await admin
      .from("products")
      .select(`
        id,
        name,
        status,
        is_approved,
        ai_review_status,
        ai_review_version
      `)
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      console.error(
        "[Admin Products] 查詢商品失敗:",
        productError.code,
        productError.message
      );

      return fail(
        "查詢商品資料失敗",
        500
      );
    }

    if (!product) {
      return fail(
        "找不到此商品",
        404
      );
    }

    // 已核准、退回或下架的商品
    // 不允許透過此 API 重複審核

    if (
      product.status !== "pending"
    ) {
      return fail(
        "此商品已經處理過，請重新整理",
        409
      );
    }

    // 確認管理員看到的商品
    // 與目前資料庫版本一致

    if (
      product.ai_review_version !==
      reviewVersion
    ) {
      return fail(
        "商品內容已被修改，請重新整理後再審核",
        409
      );
    }

    // ======================================
    // 7. 建立人工審核結果
    // ======================================

    const now =
      new Date().toISOString();

    const approved =
      action === "approve";

    const payload: Record<
      string,
      unknown
    > = {
      status: approved
        ? "approved"
        : "rejected",

      is_approved: approved,

      approved_at: approved
        ? now
        : null,

      // 更新版本，避免尚未完成的 AI
      // 使用舊版本覆蓋管理員審核結果

      ai_review_version: randomUUID(),
    };

    // 如果 AI 尚未完成審核，
    // 管理員可以直接接管。
    // 不將人工審核偽裝成 AI 通過。

    if (
      product.ai_review_status === "pending" ||
      product.ai_review_status === "reviewing"
    ) {
      payload.ai_review_status =
        "not_reviewed";

      payload.ai_review_reason = null;

      payload.ai_risk_level = null;

      payload.ai_review_flags = [];

      payload.ai_reviewed_at = null;

      payload.ai_review_model = null;
    }

    // 已完成的 AI 審核結果保留，
    // 商品最終狀態仍以管理員決定為準。

    // ======================================
    // 8. 安全更新商品
    // ======================================

    const {
      data: updatedProduct,
      error: updateError,
    } = await admin
      .from("products")
      .update(payload)
      .eq("id", productId)
      .eq("status", "pending")
      .eq(
        "ai_review_version",
        reviewVersion
      )
      .eq(
        "ai_review_status",
        product.ai_review_status
      )
      .select(`
        id,
        name,
        status,
        is_approved,
        approved_at,
        ai_review_status,
        ai_review_version
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "[Admin Products] 商品審核失敗:",
        updateError.code,
        updateError.message
      );

      return fail(
        "商品審核失敗",
        500
      );
    }

    // 若更新期間商品已被其他管理員、
    // 賣家或 AI 修改，停止本次操作。

    if (!updatedProduct) {
      return fail(
        "商品狀態已變更，請重新整理後再試",
        409
      );
    }

    // ======================================
    // 9. LINE 通知及智慧媒合
    // ======================================

    // 不在這裡重複呼叫 /api/notify。
    //
    // 沿用 Supabase 原有的
    // product_line_notification 觸發器。
    //
    // 商品狀態變更為 approved 時：
    // 1. 通知賣家商品審核通過
    // 2. 執行智慧媒合通知
    //
    // 商品狀態變更為 rejected 時：
    // 通知賣家商品未通過審核

    console.log(
      "[Admin Products] 人工審核完成",
      {
        productId,
        action,
        status: updatedProduct.status,
      }
    );

    // ======================================
    // 10. 回傳審核結果
    // ======================================

    return success({
      product: updatedProduct,

      message: approved
        ? "商品已准許上架"
        : "商品已退回",
    });
  } catch {
    console.error(
      "[Admin Products] 商品審核發生異常"
    );

    return fail(
      "商品審核失敗，請稍後再試",
      500
    );
  }
}
