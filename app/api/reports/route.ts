
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_REASONS = [
  "fraud",
  "prohibited",
  "misleading",
  "spam",
  "harassment",
  "other",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. 驗證 LINE + 南臺學校信箱
    const { admin, lineUserId, email } =
      await verifiedIdentity(req);

    // 2. 取得已驗證的 Supabase 使用者 UUID
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

    if (
      userError ||
      !user ||
      user.email?.toLowerCase() !== email
    ) {
      return fail("使用者身分驗證失敗", 401);
    }

    // 3. 讀取表單
    const raw = await req.text();

    if (raw.length > 10000) {
      return fail("檢舉資料過大", 413);
    }

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail("檢舉資料格式不正確");
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail("請提供有效的檢舉資料");
    }

    const input = body as Record<string, unknown>;

    const productId =
      typeof input.productId === "string"
        ? input.productId.trim()
        : "";

    const reason =
      typeof input.reason === "string"
        ? input.reason.trim()
        : "";

    const description =
      typeof input.description === "string"
        ? input.description.trim()
        : "";

    // 4. 驗證欄位
    if (!UUID_PATTERN.test(productId)) {
      return fail("商品 ID 格式不正確");
    }

    if (!VALID_REASONS.includes(reason)) {
      return fail("請選擇有效的檢舉原因");
    }

    if (description.length > 2000) {
      return fail("補充說明不可超過 2000 字");
    }

    // 5. 查詢被檢舉商品
    const { data: product, error: productError } =
      await admin
        .from("products")
        .select("id, name, line_user_id, status, is_approved")
        .eq("id", productId)
        .maybeSingle();

    if (productError) {
      console.error("查詢檢舉商品失敗:", productError);
      return fail("無法確認商品資料", 500);
    }

    if (
      !product ||
      product.status !== "approved" ||
      product.is_approved !== true
    ) {
      return fail("商品不存在或已經下架", 404);
    }

    // 6. 不允許檢舉自己的商品
    if (product.line_user_id === lineUserId) {
      return fail("不能檢舉自己刊登的商品", 403);
    }

    // 7. 防止重複檢舉
    const { data: existing, error: existingError } =
      await admin
        .from("product_reports")
        .select("id")
        .eq("product_id", productId)
        .eq("reporter_id", user.id)
        .maybeSingle();

    if (existingError) {
      console.error("查詢重複檢舉失敗:", existingError);
      return fail("無法確認檢舉紀錄", 500);
    }

    if (existing) {
      return fail("你已經檢舉過這項商品", 409);
    }

    // 8. 寫入檢舉紀錄
    // reporter_id 由後端驗證結果取得，
    // 不接受前端自行指定
    const { data: report, error: insertError } =
      await admin
        .from("product_reports")
        .insert({
          product_id: productId,
          reporter_id: user.id,
          reason,
          description,
        })
        .select("id")
        .single();

    if (insertError) {
      // 資料庫唯一約束，避免同時送出造成重複檢舉
      if (insertError.code === "23505") {
        return fail("你已經檢舉過這項商品", 409);
      }

      // 商品在送出過程中被刪除
      if (insertError.code === "23503") {
        return fail("商品或使用者資料不存在", 409);
      }

      console.error("建立檢舉紀錄失敗:", insertError);

      return fail("檢舉送出失敗，請稍後再試", 500);
    }

    return NextResponse.json(
      {
        success: true,
        message: "檢舉已成功送出，等待管理員審核",
        reportId: report.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("檢舉 API 發生錯誤:", error);

    const message =
      error instanceof Error
        ? error.message
        : "檢舉送出失敗";

    const authError =
      message.includes("驗證") ||
      message.includes("登入") ||
      message.includes("憑證") ||
      message.includes("LINE");

    return fail(
      authError ? message : "檢舉送出失敗，請稍後再試",
      authError ? 401 : 500
    );
  }
}
