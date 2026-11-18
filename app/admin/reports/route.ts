
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 與原本 app/admin/page.tsx 的管理員名單一致
// 這裡在伺服器端再次驗證，不能只依賴前端判斷
const ADMIN_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function getErrorStatus(message: string): number {
  if (
    message.includes("登入") ||
    message.includes("驗證") ||
    message.includes("憑證") ||
    message.includes("LINE")
  ) {
    return 401;
  }

  return 500;
}

// GET：管理員取得檢舉紀錄
export async function GET(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await verifiedIdentity(req);

    // 後端驗證管理員 LINE ID
    if (!ADMIN_IDS.includes(lineUserId)) {
      return fail("你沒有管理員權限", 403);
    }

    // 讀取檢舉紀錄
    const { data: reports, error } = await admin
      .from("product_reports")
      .select(
        "id, product_id, reporter_id, reason, description, status, admin_note, reviewed_by, reviewed_at, created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (error) {
      console.error("讀取檢舉紀錄失敗:", error);
      return fail("讀取檢舉紀錄失敗", 500);
    }

    const productIds = [
      ...new Set(
        (reports || []).map(
          (report) => report.product_id
        )
      ),
    ];

    // 取得被檢舉商品的資料
    let products: any[] = [];

    if (productIds.length > 0) {
      const { data, error: productError } =
        await admin
          .from("products")
          .select(
            "id, name, price, category, image_url, status, is_approved, line_user_id"
          )
          .in("id", productIds);

      if (productError) {
        console.error(
          "讀取被檢舉商品失敗:",
          productError
        );

        return fail("讀取商品資料失敗", 500);
      }

      products = data || [];
    }

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    const result = (reports || []).map(
      (report) => ({
        ...report,
        product:
          productMap.get(report.product_id) ||
          null,
      })
    );

    return NextResponse.json({
      success: true,
      reports: result,
    });
  } catch (error) {
    console.error(
      "管理員讀取檢舉 API 錯誤:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "讀取檢舉紀錄失敗";

    return fail(
      getErrorStatus(message) === 401
        ? message
        : "讀取檢舉紀錄失敗，請稍後再試",
      getErrorStatus(message)
    );
  }
}

// POST：管理員審核檢舉
export async function POST(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await verifiedIdentity(req);

    // 後端確認管理員身分
    if (!ADMIN_IDS.includes(lineUserId)) {
      return fail("你沒有管理員權限", 403);
    }

    // 取得已驗證的 Supabase 使用者 ID
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

    if (userError || !user) {
      return fail("管理員身分驗證失敗", 401);
    }

    // 解析請求資料
    const raw = await req.text();

    if (raw.length > 10000) {
      return fail("資料過大", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail("資料格式不正確");
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail("請提供有效的審核資料");
    }

    const input = body as Record<
      string,
      unknown
    >;

    const reportId =
      typeof input.reportId === "string"
        ? input.reportId.trim()
        : "";

    const action =
      typeof input.action === "string"
        ? input.action.trim()
        : "";

    const adminNote =
      typeof input.adminNote === "string"
        ? input.adminNote.trim()
        : "";

    if (!UUID_PATTERN.test(reportId)) {
      return fail("檢舉紀錄 ID 格式不正確");
    }

    if (
      action !== "dismiss" &&
      action !== "remove"
    ) {
      return fail("無效的審核操作");
    }

    if (adminNote.length > 2000) {
      return fail(
        "管理員備註不可超過 2000 字"
      );
    }

    // 先確認檢舉紀錄仍在待審核狀態
    const {
      data: report,
      error: reportError,
    } = await admin
      .from("product_reports")
      .select("id, product_id, status")
      .eq("id", reportId)
      .maybeSingle();

    if (reportError) {
      console.error(
        "查詢檢舉紀錄失敗:",
        reportError
      );

      return fail("查詢檢舉紀錄失敗", 500);
    }

    if (!report) {
      return fail("找不到檢舉紀錄", 404);
    }

    if (report.status !== "pending") {
      return fail(
        "這筆檢舉已經審核過，請重新整理",
        409
      );
    }

    // 使用資料庫 RPC 執行審核
    // 由資料庫負責原子性更新檢舉及商品狀態
    const { error: rpcError } =
      await admin.rpc(
        "admin_resolve_product_report",
        {
          p_report_id: reportId,
          p_action: action,
          p_admin_user_id: user.id,
          p_admin_note: adminNote,
        }
      );

    if (rpcError) {
      console.error(
        "檢舉審核 RPC 失敗:",
        rpcError
      );

      return fail(
        "審核失敗，請檢查資料庫函式設定",
        500
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "remove"
          ? "已確認違規，商品已下架"
          : "已駁回檢舉",
    });
  } catch (error) {
    console.error(
      "管理員審核檢舉 API 錯誤:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "檢舉審核失敗";

    return fail(
      getErrorStatus(message) === 401
        ? message
        : "檢舉審核失敗，請稍後再試",
      getErrorStatus(message)
    );
  }
}
