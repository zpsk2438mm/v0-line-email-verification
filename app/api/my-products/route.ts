
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ==========================================
// 個人商品查詢欄位
// ==========================================

const PRIVATE_PRODUCT_FIELDS = [
  "id",
  "name",
  "price",
  "category",
  "condition",
  "description",
  "image_url",
  "created_at",
  "approved_at",
  "status",
  "is_approved",
].join(", ");

// ==========================================
// 商品狀態
// ==========================================

const ALLOWED_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "reported",
  "removed",
];

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
// 分頁設定
// ==========================================

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_PAGE = 1000;

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
// 驗證分頁數字
// ==========================================

function parsePositiveInteger(
  value: string | null,
  defaultValue: number,
  maxValue: number
): number | null {
  if (value === null) {
    return defaultValue;
  }

  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < 1 ||
    number > maxValue
  ) {
    return null;
  }

  return number;
}

// ==========================================
// GET：私人商品查詢
// 必須完成 LINE 與校園信箱驗證
// ==========================================

export async function GET(
  req: NextRequest
) {
  try {
    // ======================================
    // 1. 驗證登入身分
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
    // 2. 取得查詢參數
    // ======================================

    const params =
      req.nextUrl.searchParams;

    const productId =
      params.get("id")?.trim() || "";

    const status =
      params.get("status")?.trim() || "";

    const category =
      params.get("category")?.trim() || "";

    // ======================================
    // 3. 驗證查詢參數
    // ======================================

    if (
      params.has("id") &&
      !validUUID(productId)
    ) {
      return fail(
        "商品 ID 格式不正確"
      );
    }

    if (
      status &&
      status !== "all" &&
      !ALLOWED_STATUSES.includes(status)
    ) {
      return fail(
        "商品狀態不正確"
      );
    }

    if (
      category &&
      category !== "all" &&
      !CATEGORIES.includes(category)
    ) {
      return fail(
        "商品分類不正確"
      );
    }

    const page =
      parsePositiveInteger(
        params.get("page"),
        1,
        MAX_PAGE
      );

    const limit =
      parsePositiveInteger(
        params.get("limit"),
        DEFAULT_LIMIT,
        MAX_LIMIT
      );

    if (
      page === null ||
      limit === null
    ) {
      return fail(
        "分頁參數不正確"
      );
    }

    // ======================================
    // 4. 查詢單一個人商品
    // 提供編輯商品頁面使用
    // ======================================

    if (productId) {
      const {
        data,
        error,
      } = await admin
        .from("products")
        .select(PRIVATE_PRODUCT_FIELDS)
        .eq("id", productId)

        // 驗證商品所有權

        .eq("line_user_id", lineUserId)
        .eq("verified_email", email)

        .maybeSingle();

      if (error) {
        console.error(
          "[My Products] 單一商品查詢失敗",
          error.code
        );

        return fail(
          "商品資料讀取失敗",
          500
        );
      }

      // 商品不存在或不屬於目前登入者

      if (!data) {
        return fail(
          "商品不存在或你沒有查看權限",
          404
        );
      }

      return respond({
        success: true,
        product: data,
      });
    }

    // ======================================
    // 5. 查詢個人商品清單
    // 提供我的商品及個人中心使用
    // ======================================

    let query = admin
      .from("products")
      .select(
        PRIVATE_PRODUCT_FIELDS,
        {
          count: "exact",
        }
      )

      // 只能查詢目前登入者的商品

      .eq("line_user_id", lineUserId)
      .eq("verified_email", email);

    // ======================================
    // 6. 商品狀態篩選
    // ======================================

    if (
      status &&
      status !== "all"
    ) {
      query = query.eq(
        "status",
        status
      );
    }

    // ======================================
    // 7. 商品分類篩選
    // ======================================

    if (
      category &&
      category !== "all"
    ) {
      query = query.eq(
        "category",
        category
      );
    }

    // ======================================
    // 8. 商品分頁與排序
    // ======================================

    const from =
      (page - 1) * limit;

    const to =
      from + limit - 1;

    const {
      data,
      error,
      count,
    } = await query
      .order("created_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error(
        "[My Products] 個人商品查詢失敗",
        error.code
      );

      return fail(
        "個人商品資料讀取失敗",
        500
      );
    }

    // ======================================
    // 9. 整理分頁資料
    // ======================================

    const products = data || [];

    const total = count || 0;

    const totalPages =
      Math.ceil(total / limit);

    // ======================================
    // 10. 回傳個人商品資料
    // ======================================

    return respond({
      success: true,

      products,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    });
  } catch {
    console.error(
      "[My Products] 系統處理失敗"
    );

    return fail(
      "個人商品查詢發生錯誤，請稍後再試",
      500
    );
  }
}
