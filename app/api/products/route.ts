
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ==========================================
// 公開商品欄位
// 不回傳賣家私人資料及 AI 內部審核資訊
// ==========================================

const PUBLIC_PRODUCT_FIELDS = [
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
const MAX_KEYWORD_LENGTH = 100;

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
      "Cache-Control": "no-store",
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
// 安全處理搜尋關鍵字
// 避免特殊字元影響 PostgREST 查詢語法
// ==========================================

function escapeSearchKeyword(
  value: string
): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

// ==========================================
// 建立後端 Supabase Client
// ==========================================

function createAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 伺服器設定不完整"
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// ==========================================
// GET：公開商品查詢
// 不需要 LINE 登入及校園信箱驗證
// ==========================================

export async function GET(
  req: NextRequest
) {
  try {
    const params =
      req.nextUrl.searchParams;

    const productId =
      params.get("id")?.trim() || "";

    const category =
      params.get("category")?.trim() || "";

    const keyword =
      params.get("q")?.trim() || "";

    // ======================================
    // 1. 驗證查詢參數
    // ======================================

    if (
      productId &&
      !validUUID(productId)
    ) {
      return fail(
        "商品 ID 格式不正確"
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

    if (
      keyword.length >
      MAX_KEYWORD_LENGTH
    ) {
      return fail(
        "搜尋關鍵字不得超過 100 字"
      );
    }

    // 拒絕可能影響搜尋語法的特殊字元

    if (
      /[(),."*\\\u0000-\u001f\u007f]/.test(
        keyword
      )
    ) {
      return fail(
        "搜尋關鍵字包含不支援的特殊字元"
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

    const admin =
      createAdminClient();

    // ======================================
    // 2. 查詢單一商品
    // ======================================

    if (productId) {
      const {
        data,
        error,
      } = await admin
        .from("products")
        .select(PUBLIC_PRODUCT_FIELDS)
        .eq("id", productId)
        .eq("status", "approved")
        .eq("is_approved", true)
        .maybeSingle();

      if (error) {
        console.error(
          "[Public Products] 商品查詢失敗",
          error.code
        );

        return fail(
          "商品資料讀取失敗",
          500
        );
      }

      if (!data) {
        return fail(
          "商品不存在或目前尚未公開",
          404
        );
      }

      return respond({
        success: true,
        product: data,
      });
    }

    // ======================================
    // 3. 建立公開商品清單查詢
    // ======================================

    let query = admin
      .from("products")
      .select(
        PUBLIC_PRODUCT_FIELDS,
        {
          count: "exact",
        }
      )
      .eq("status", "approved")
      .eq("is_approved", true);

    // ======================================
    // 4. 商品分類篩選
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
    // 5. 商品關鍵字搜尋
    // 搜尋商品名稱及商品詳情
    // ======================================

    if (keyword) {
      const safeKeyword =
        escapeSearchKeyword(keyword);

      query = query.or(
        `name.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`
      );
    }

    // ======================================
    // 6. 分頁及排序
    // 最新核准的商品優先顯示
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
      .order("approved_at", {
        ascending: false,
        nullsFirst: false,
      })
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
        "[Public Products] 商品清單查詢失敗",
        error.code
      );

      return fail(
        "商品清單讀取失敗",
        500
      );
    }

    // ======================================
    // 7. 整理分頁資訊
    // ======================================

    const products = data || [];

    const total = count || 0;

    const totalPages =
      Math.ceil(total / limit);

    // ======================================
    // 8. 回傳公開商品資料
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
      "[Public Products] 系統處理失敗"
    );

    return fail(
      "商品查詢發生錯誤，請稍後再試",
      500
    );
  }
}
