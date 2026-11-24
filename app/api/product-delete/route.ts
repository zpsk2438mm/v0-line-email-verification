
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ==========================================
// 允許賣家刪除的商品狀態
// ==========================================

const DELETABLE_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

// ==========================================
// 請求大小限制
// ==========================================

const MAX_REQUEST_SIZE = 4096;

// ==========================================
// 統一 JSON 回應
// ==========================================

function respond(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Authorization, X-Line-ID-Token",
    },
  });
}

function fail(
  message: string,
  status = 400
) {
  return respond(
    {
      success: false,
      error: message,
    },
    status
  );
}

// ==========================================
// 驗證 UUID
// ==========================================

function validUUID(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ==========================================
// 清理文字
// ==========================================

function cleanText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

// ==========================================
// DELETE：安全刪除個人商品
// ==========================================

export async function DELETE(
  req: NextRequest
) {
  try {
    // ======================================
    // 1. 驗證 LINE 及校園信箱
    // ======================================

    let identity: Awaited<
      ReturnType<typeof verifiedIdentity>
    >;

    try {
      identity = await verifiedIdentity(req);
    } catch (error) {
      return fail(
        error instanceof Error
          ? error.message
          : "請先完成 LINE 登入及校園信箱驗證",
        401
      );
    }

    const {
      admin,
      email,
      lineUserId,
    } = identity;

    // ======================================
    // 2. 驗證請求大小
    // ======================================

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      return fail(
        "請求資料過大",
        413
      );
    }

    if (!req.body) {
      return fail(
        "缺少商品資料"
      );
    }

    const reader =
      req.body.getReader();

    const chunks: Buffer[] = [];

    let totalSize = 0;

    try {
      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) break;

        totalSize += value.byteLength;

        if (
          totalSize > MAX_REQUEST_SIZE
        ) {
          return fail(
            "請求資料過大",
            413
          );
        }

        chunks.push(
          Buffer.from(value)
        );
      }
    } finally {
      await reader.cancel().catch(
        () => {}
      );

      reader.releaseLock();
    }

    const requestText =
      Buffer.concat(chunks).toString("utf8");

    // ======================================
    // 3. 解析商品資料
    // ======================================

    let body: Record<string, unknown>;

    try {
      const parsed =
        JSON.parse(requestText);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return fail(
          "商品資料格式不正確"
        );
      }

      body = parsed;
    } catch {
      return fail(
        "商品資料格式不正確"
      );
    }

    const productId =
      cleanText(body.productId);

    // ======================================
    // 4. 驗證商品 ID
    // ======================================

    if (!validUUID(productId)) {
      return fail(
        "商品 ID 格式不正確"
      );
    }

    // ======================================
    // 5. 查詢商品及驗證所有權
    // ======================================

    const {
      data: product,
      error: lookupError,
    } = await admin
      .from("products")
      .select(
        "id, status, ai_review_version"
      )
      .eq("id", productId)
      .eq("line_user_id", lineUserId)
      .eq("verified_email", email)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "[Product Delete] 商品查詢失敗",
        lookupError.code
      );

      return fail(
        "無法讀取商品資料",
        500
      );
    }

    if (!product) {
      return fail(
        "商品不存在或你沒有刪除權限",
        404
      );
    }

    // ======================================
    // 6. 驗證商品狀態
    // ======================================

    if (
      product.status === "reported"
    ) {
      return fail(
        "此商品正在進行檢舉審核，暫時無法刪除",
        409
      );
    }

    if (
      product.status === "removed"
    ) {
      return fail(
        "此商品已因違規下架，請聯絡管理員",
        409
      );
    }

    if (
      !DELETABLE_STATUSES.includes(
        product.status
      )
    ) {
      return fail(
        "目前商品狀態不允許刪除",
        409
      );
    }

    // ======================================
    // 7. 檢查商品檢舉紀錄
    // 保留既有檢舉及管理員審核紀錄
    // ======================================

    const {
      data: reports,
      error: reportError,
    } = await admin
      .from("product_reports")
      .select("id")
      .eq("product_id", productId)
      .limit(1);

    if (reportError) {
      console.error(
        "[Product Delete] 檢舉紀錄查詢失敗",
        reportError.code
      );

      return fail(
        "無法確認商品檢舉狀態，請稍後再試",
        500
      );
    }

    if (
      reports &&
      reports.length > 0
    ) {
      return fail(
        "此商品具有檢舉紀錄，為保留審核資料，請聯絡管理員處理",
        409
      );
    }

    // ======================================
    // 8. 安全刪除商品
    //
    // 再次確認：
    // 商品 ID
    // LINE User ID
    // 校園信箱
    // 商品狀態
    // AI 審核版本
    //
    // 避免刪除已被其他操作修改的商品
    // ======================================

    const {
      data: deletedProduct,
      error: deleteError,
    } = await admin
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("line_user_id", lineUserId)
      .eq("verified_email", email)
      .eq("status", product.status)
      .eq(
        "ai_review_version",
        product.ai_review_version
      )
      .in(
        "status",
        DELETABLE_STATUSES
      )
      .select("id")
      .maybeSingle();

    if (deleteError) {
      console.error(
        "[Product Delete] 商品刪除失敗",
        deleteError.code
      );

      // 外鍵關聯限制

      if (
        deleteError.code === "23503"
      ) {
        return fail(
          "此商品仍有關聯紀錄，暫時無法刪除，請聯絡管理員",
          409
        );
      }

      return fail(
        "商品刪除失敗，請稍後再試",
        500
      );
    }

    if (!deletedProduct) {
      return fail(
        "商品狀態已變更或商品已不存在，請重新整理後再試",
        409
      );
    }

    // ======================================
    // 9. 暫時保留 Storage 商品照片
    //
    // 避免誤刪其他商品共用的照片
    // 後續統一建立安全圖片清理機制
    // ======================================

    console.log(
      "[Product Delete] 商品刪除成功",
      {
        productId: deletedProduct.id,
      }
    );

    // ======================================
    // 10. 回傳成功結果
    // ======================================

    return respond({
      success: true,
      productId: deletedProduct.id,
      message: "商品刪除成功",
    });
  } catch {
    console.error(
      "[Product Delete] 系統處理失敗"
    );

    return fail(
      "商品刪除發生錯誤，請稍後再試",
      500
    );
  }
}
