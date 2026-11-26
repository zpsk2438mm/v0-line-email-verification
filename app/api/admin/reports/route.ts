
import { NextRequest, NextResponse } from "next/server";
import {
  verifiedAdmin,
  AdminAuthError,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
// 管理員授權錯誤處理
// ==========================================

function authFailure(error: unknown) {
  if (error instanceof AdminAuthError) {
    return fail(
      error.message,
      error.status
    );
  }

  console.error(
    "[Admin Reports] 管理員授權發生異常"
  );

  return fail(
    "管理員授權服務暫時無法使用",
    503
  );
}

// ==========================================
// GET：管理員取得商品檢舉紀錄
// ==========================================

export async function GET(
  req: NextRequest
) {
  let identity;

  try {
    identity = await verifiedAdmin(req);

  } catch (error: unknown) {
    return authFailure(error);
  }

  const { admin } = identity;

  try {
    // 1. 查詢檢舉紀錄

    const {
      data: reports,
      error,
    } = await admin
      .from("product_reports")
      .select(
        "id, product_id, reporter_id, reason, description, status, admin_note, reviewed_by, reviewed_at, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (error) {
      console.error(
        "[Admin Reports] 讀取檢舉紀錄失敗:",
        error.code
      );

      return fail(
        "讀取檢舉紀錄失敗",
        500
      );
    }

    // 2. 收集商品 ID

    const productIds = [
      ...new Set(
        (reports || []).map(
          (report) => report.product_id
        )
      ),
    ];

    // 3. 查詢被檢舉商品

    let products: any[] = [];

    if (productIds.length > 0) {
      const {
        data,
        error: productError,
      } = await admin
        .from("products")
        .select(
          "id, name, price, category, image_url, status, is_approved, line_user_id"
        )
        .in("id", productIds);

      if (productError) {
        console.error(
          "[Admin Reports] 讀取被檢舉商品失敗:",
          productError.code
        );

        return fail(
          "讀取商品資料失敗",
          500
        );
      }

      products = data || [];
    }

    // 4. 建立商品對照表

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    // 5. 合併檢舉與商品資料

    const result = (reports || []).map(
      (report) => ({
        ...report,

        product:
          productMap.get(report.product_id) ||
          null,
      })
    );

    return success({
      reports: result,
    });

  } catch {
    console.error(
      "[Admin Reports] 讀取檢舉 API 發生異常"
    );

    return fail(
      "讀取檢舉紀錄失敗，請稍後再試",
      500
    );
  }
}

// ==========================================
// POST：管理員審核商品檢舉
// ==========================================

export async function POST(
  req: NextRequest
) {
  let identity;

  try {
    identity = await verifiedAdmin(req);

  } catch (error: unknown) {
    return authFailure(error);
  }

  const {
    admin,
    authUserId,
  } = identity;

  try {
    // 1. 驗證請求大小

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      return fail(
        "資料過大",
        413
      );
    }

    const raw = await req.text();

    if (
      Buffer.byteLength(raw, "utf8") >
      MAX_REQUEST_SIZE
    ) {
      return fail(
        "資料過大",
        413
      );
    }

    // 2. 解析 JSON

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
        "請提供有效的審核資料"
      );
    }

    const input = body as Record<
      string,
      unknown
    >;

    // 3. 取得檢舉 ID

    const reportId =
      typeof input.reportId === "string"
        ? input.reportId.trim()
        : "";

    // 4. 取得審核動作

    const action =
      typeof input.action === "string"
        ? input.action.trim()
        : "";

    // 5. 取得管理員備註

    const adminNote =
      typeof input.adminNote === "string"
        ? input.adminNote.trim()
        : "";

    // 6. 驗證檢舉 ID

    if (!UUID_PATTERN.test(reportId)) {
      return fail(
        "檢舉紀錄 ID 格式不正確",
        400
      );
    }

    // 7. 驗證審核動作

    if (
      action !== "dismiss" &&
      action !== "remove"
    ) {
      return fail(
        "無效的審核操作",
        400
      );
    }

    // 8. 驗證備註長度

    if (adminNote.length > 2000) {
      return fail(
        "管理員備註不可超過 2000 字",
        400
      );
    }

    // 9. 確認檢舉紀錄存在

    const {
      data: report,
      error: reportError,
    } = await admin
      .from("product_reports")
      .select(
        "id, product_id, status"
      )
      .eq("id", reportId)
      .maybeSingle();

    if (reportError) {
      console.error(
        "[Admin Reports] 查詢檢舉紀錄失敗:",
        reportError.code
      );

      return fail(
        "查詢檢舉紀錄失敗",
        500
      );
    }

    if (!report) {
      return fail(
        "找不到檢舉紀錄",
        404
      );
    }

    // 10. 防止重複審核

    if (report.status !== "pending") {
      return fail(
        "這筆檢舉已經審核過，請重新整理",
        409
      );
    }

    // 11. 呼叫 Supabase RPC
    //
    // 管理員 Auth User ID 直接使用
    // verifiedAdmin 回傳的已驗證身分。
    //
    // 不接受前端自行指定管理員 ID。

    const {
      error: rpcError,
    } = await admin.rpc(
      "admin_resolve_product_report",
      {
        p_report_id: reportId,

        p_action: action,

        p_admin_user_id: authUserId,

        p_admin_note: adminNote,
      }
    );

    if (rpcError) {
      console.error(
        "[Admin Reports] 檢舉審核 RPC 失敗:",
        {
          code: rpcError.code,
        }
      );

      return fail(
        "審核失敗，請檢查資料庫函式設定",
        500
      );
    }

    // 12. 回傳審核結果

    return success({
      message:
        action === "remove"
          ? "已確認違規，商品已下架"
          : "已駁回檢舉",
    });

  } catch {
    console.error(
      "[Admin Reports] 檢舉審核 API 發生異常"
    );

    return fail(
      "檢舉審核失敗，請稍後再試",
      500
    );
  }
}
