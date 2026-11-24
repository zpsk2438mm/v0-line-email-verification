
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 50;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_FIELDS =
  "id, keyword, is_active, created_at, updated_at";

// ==========================================
// 共用回應函式
// ==========================================

function success(data: object, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

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
// 共用錯誤處理
// ==========================================

function handleError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "系統發生錯誤";

  console.error("[Keyword Alerts]", message);

  if (message.includes("伺服器設定")) {
    return fail(message, 500);
  }

  if (message.includes("無法連線")) {
    return fail(message, 503);
  }

  if (
    message.includes("驗證") ||
    message.includes("登入") ||
    message.includes("憑證") ||
    message.includes("LINE")
  ) {
    return fail(message, 401);
  }

  return fail("操作失敗，請稍後再試", 500);
}

// ==========================================
// 安全解析 JSON
// ==========================================

async function readBody(req: NextRequest) {
  const raw = await req.text();

  if (raw.length > 5000) {
    return null;
  }

  try {
    const body = JSON.parse(raw);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ==========================================
// 驗證 LINE 與學校信箱綁定狀態
// ==========================================

async function getIdentity(req: NextRequest) {
  const identity = await verifiedIdentity(req);

  const { admin, lineUserId, email } = identity;

  const { data: binding, error } = await admin
    .from("line_notification_bindings")
    .select("verified_email, messaging_user_id")
    .eq("line_login_user_id", lineUserId)
    .maybeSingle();

  if (error) {
    console.error(
      "[Keyword Alerts] 查詢綁定失敗:",
      error.code
    );

    throw new Error("無法確認通知帳號");
  }

  if (
    !binding ||
    !binding.messaging_user_id ||
    binding.verified_email?.toLowerCase() !== email
  ) {
    throw new Error(
      "請先完成 LINE 官方帳號通知綁定驗證"
    );
  }

  return identity;
}

// ==========================================
// GET：查詢自己的關鍵字
// ==========================================

export async function GET(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await getIdentity(req);

    const { data, error } = await admin
      .from("keyword_alerts")
      .select(SELECT_FIELDS)
      .eq("line_user_id", lineUserId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[Keyword Alerts] 查詢失敗:",
        error
      );

      return fail("無法取得關鍵字資料", 500);
    }

    const alerts = data || [];

    return success({
      alerts,
      count: alerts.length,
      maxKeywords: MAX_KEYWORDS,
    });
  } catch (error) {
    return handleError(error);
  }
}

// ==========================================
// POST：新增關鍵字
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await getIdentity(req);

    const body = await readBody(req);

    if (!body) {
      return fail("請提供有效的關鍵字資料");
    }

    const keyword =
      typeof body.keyword === "string"
        ? body.keyword.trim()
        : "";

    // 驗證關鍵字內容

    if (!keyword) {
      return fail("請輸入追蹤關鍵字");
    }

    if (
      Array.from(keyword).length >
      MAX_KEYWORD_LENGTH
    ) {
      return fail("關鍵字不可超過 50 個字");
    }

    if (/[\u0000-\u001F\u007F]/.test(keyword)) {
      return fail("關鍵字包含不支援的字元");
    }

    // 查詢目前的關鍵字

    const { data: existing, error: existingError } =
      await admin
        .from("keyword_alerts")
        .select("id, keyword")
        .eq("line_user_id", lineUserId);

    if (existingError) {
      console.error(
        "[Keyword Alerts] 查詢關鍵字失敗:",
        existingError
      );

      return fail("無法確認關鍵字資料", 500);
    }

    const alerts = existing || [];

    // 防止重複關鍵字

    const duplicate = alerts.some(
      (item) =>
        item.keyword.trim().toLowerCase() ===
        keyword.toLowerCase()
    );

    if (duplicate) {
      return fail("你已經追蹤過這個關鍵字", 409);
    }

    // 限制最多 10 組

    if (alerts.length >= MAX_KEYWORDS) {
      return fail(
        "每位使用者最多只能追蹤 10 組關鍵字",
        409
      );
    }

    // 新增關鍵字

    const { data, error } = await admin
      .from("keyword_alerts")
      .insert({
        line_user_id: lineUserId,
        keyword,
        is_active: true,
      })
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      console.error(
        "[Keyword Alerts] 新增失敗:",
        error
      );

      // 資料庫唯一索引防止重複新增

      if (error.code === "23505") {
        return fail(
          "你已經追蹤過這個關鍵字",
          409
        );
      }

      // 資料庫 Trigger 限制最多 10 組

      if (
        error.message.includes("最多") ||
        error.message.includes("10 組")
      ) {
        return fail(
          "每位使用者最多只能追蹤 10 組關鍵字",
          409
        );
      }

      return fail("新增關鍵字失敗", 500);
    }

    return success(
      {
        message: "關鍵字追蹤新增成功",
        alert: data,
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}

// ==========================================
// PUT：開啟或暫停關鍵字通知
// ==========================================

export async function PUT(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await getIdentity(req);

    const body = await readBody(req);

    if (!body) {
      return fail("請提供有效的修改資料");
    }

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    const isActive = body.is_active;

    if (!UUID_PATTERN.test(id)) {
      return fail("關鍵字 ID 格式不正確");
    }

    if (typeof isActive !== "boolean") {
      return fail("通知狀態格式不正確");
    }

    // 只能修改自己的關鍵字

    const { data, error } = await admin
      .from("keyword_alerts")
      .update({
        is_active: isActive,
      })
      .eq("id", id)
      .eq("line_user_id", lineUserId)
      .select(SELECT_FIELDS)
      .maybeSingle();

    if (error) {
      console.error(
        "[Keyword Alerts] 更新失敗:",
        error
      );

      return fail("更新通知狀態失敗", 500);
    }

    if (!data) {
      return fail(
        "找不到關鍵字或沒有操作權限",
        404
      );
    }

    return success({
      message: isActive
        ? "已開啟關鍵字通知"
        : "已暫停關鍵字通知",
      alert: data,
    });
  } catch (error) {
    return handleError(error);
  }
}

// ==========================================
// DELETE：刪除關鍵字
// ==========================================

export async function DELETE(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await getIdentity(req);

    const body = await readBody(req);

    if (!body) {
      return fail("請提供有效的刪除資料");
    }

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!UUID_PATTERN.test(id)) {
      return fail("關鍵字 ID 格式不正確");
    }

    // 只能刪除自己的關鍵字

    const { data, error } = await admin
      .from("keyword_alerts")
      .delete()
      .eq("id", id)
      .eq("line_user_id", lineUserId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "[Keyword Alerts] 刪除失敗:",
        error
      );

      return fail("刪除關鍵字失敗", 500);
    }

    if (!data) {
      return fail(
        "找不到關鍵字或沒有操作權限",
        404
      );
    }

    return success({
      message: "已刪除追蹤關鍵字",
      id: data.id,
    });
  } catch (error) {
    return handleError(error);
  }
}
