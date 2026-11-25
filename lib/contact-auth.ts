
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// ==========================================
// 統一身分驗證安全設定
// ==========================================

// 目前為安全遷移相容模式。
//
// false：
// 允許尚未建立統一身分綁定的使用者
// 繼續使用既有功能。
//
// true：
// 強制要求所有使用者完成統一身分綁定。
//
// 注意：
// 既有帳號尚未完成安全遷移前，
// 不可以修改為 true。

const REQUIRE_IDENTITY_BINDING = false;

// LINE 官方驗證逾時時間

const LINE_VERIFY_TIMEOUT_MS = 10000;

// ==========================================
// 驗證校園信箱格式
// ==========================================

function isValidSchoolEmail(
  email: string
): boolean {
  return /^[^@\s]+@stust\.edu\.tw$/.test(
    email
  );
}

// ==========================================
// 驗證 LINE User ID 格式
// ==========================================

function isValidLineUserId(
  lineUserId: string
): boolean {
  return /^U[0-9a-fA-F]{32}$/.test(
    lineUserId
  );
}

// ==========================================
// 統一身分綁定 RPC 回傳格式
// ==========================================

interface IdentityBindingResult {
  success: boolean;
  code: string;
}

// ==========================================
// 後端統一身分驗證
// ==========================================

export async function verifiedIdentity(
  req: NextRequest
) {
  // ========================================
  // 1. 取得 Supabase 與 LINE 登入憑證
  // ========================================

  const authorization =
    req.headers.get("authorization");

  const bearerMatch =
    authorization?.match(
      /^Bearer\s+([^\s]+)$/i
    );

  const bearer = bearerMatch?.[1];

  const idToken = req.headers
    .get("x-line-id-token")
    ?.trim();

  // ========================================
  // 2. 取得伺服器環境變數
  // ========================================

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const channel =
    process.env.LINE_LOGIN_CHANNEL_ID?.trim();

  if (
    !url ||
    !anon ||
    !service ||
    !channel
  ) {
    console.error(
      "伺服器缺少必要環境變數"
    );

    throw new Error(
      "伺服器設定不完整，請聯絡管理員"
    );
  }

  // ========================================
  // 3. 檢查登入憑證是否存在
  // ========================================

  if (!bearer) {
    throw new Error(
      "請先完成學校信箱驗證"
    );
  }

  if (!idToken) {
    throw new Error(
      "無法取得 LINE 登入憑證，請重新登入 LINE"
    );
  }

  // 避免異常過大的登入憑證

  if (bearer.length > 16384) {
    throw new Error(
      "學校信箱登入憑證格式不正確"
    );
  }

  if (idToken.length > 16384) {
    throw new Error(
      "LINE 登入憑證格式不正確，請重新登入 LINE"
    );
  }

  // ========================================
  // 4. 建立 Supabase Auth 驗證連線
  // ========================================

  const auth = createClient(
    url,
    anon,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  // ========================================
  // 5. 向 Supabase 驗證使用者
  // ========================================

  const {
    data: { user },
    error,
  } = await auth.auth.getUser(bearer);

  if (
    error ||
    !user ||
    !user.id ||
    !user.email
  ) {
    throw new Error(
      "請先完成學校信箱驗證"
    );
  }

  // 統一信箱格式

  const email = user.email
    .trim()
    .toLowerCase();

  // ========================================
  // 6. 驗證校園信箱網域
  // ========================================

  if (!isValidSchoolEmail(email)) {
    throw new Error(
      "請先完成學校信箱驗證"
    );
  }

  // ========================================
  // 7. 確認校園信箱已正式驗證
  // ========================================

  if (!user.email_confirmed_at) {
    throw new Error(
      "請先完成學校信箱驗證"
    );
  }

  // ========================================
  // 8. 向 LINE 官方驗證 ID Token
  // ========================================

  let response: Response;

  let line: any = null;

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    LINE_VERIFY_TIMEOUT_MS
  );

  try {
    response = await fetch(
      "https://api.line.me/oauth2/v2.1/verify",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          id_token: idToken,
          client_id: channel,
        }),

        cache: "no-store",

        redirect: "error",

        signal: controller.signal,
      }
    );

    line = await response
      .json()
      .catch(() => null);

  } catch {
    throw new Error(
      "無法連線至 LINE 驗證服務，請稍後再試"
    );

  } finally {
    clearTimeout(timeout);
  }

  // ========================================
  // 9. 處理 LINE 官方驗證錯誤
  // ========================================

  if (!response.ok) {
    // 不記錄 Token、信箱、LINE ID
    // 或完整的 LINE 官方回應。

    console.error(
      "LINE ID Token 驗證失敗",
      {
        status: response.status,
      }
    );

    const description = String(
      line?.error_description || ""
    ).toLowerCase();

    if (
      description.includes("expired") ||
      description.includes("expiration")
    ) {
      throw new Error(
        "LINE 登入憑證已過期，請重新登入 LINE"
      );
    }

    if (
      description.includes("audience") ||
      description.includes("client_id") ||
      description.includes("client id")
    ) {
      throw new Error(
        "LINE Channel ID 與登入憑證不符"
      );
    }

    throw new Error(
      "LINE 官方驗證未通過，請查看 Vercel Logs"
    );
  }

  // ========================================
  // 10. 驗證 LINE 官方回傳資料
  // ========================================

  if (
    typeof line?.sub !== "string" ||
    !line.sub ||
    !line?.aud
  ) {
    console.error(
      "LINE 驗證回應缺少必要欄位"
    );

    throw new Error(
      "LINE 身分資料不完整"
    );
  }

  // ========================================
  // 11. 驗證 LINE Channel ID
  // ========================================

  if (String(line.aud) !== channel) {
    console.error(
      "LINE Channel ID 不一致"
    );

    throw new Error(
      "LINE Channel ID 與登入憑證不符"
    );
  }

  // ========================================
  // 12. 驗證 LINE User ID 格式
  // ========================================

  const lineUserId = line.sub;

  if (!isValidLineUserId(lineUserId)) {
    console.error(
      "LINE User ID 格式驗證失敗"
    );

    throw new Error(
      "LINE 身分資料格式不正確"
    );
  }

  // ========================================
  // 13. 建立 Supabase 後端管理連線
  // ========================================

  const admin = createClient(
    url,
    service,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  // ========================================
  // 14. 執行原子身分綁定 RPC
  // ========================================

  const {
    data: bindingData,
    error: bindingError,
  } = await admin.rpc(
    "bind_verified_identity",
    {
      p_auth_user_id: user.id,

      p_line_user_id: lineUserId,

      p_verified_email: email,
    }
  );

  // ========================================
  // 15. 處理 RPC 執行錯誤
  // ========================================

  if (bindingError) {
    console.error(
      "統一身分綁定 RPC 執行失敗",
      {
        code: bindingError.code,
      }
    );

    throw new Error(
      "身分驗證服務暫時無法使用，請稍後再試"
    );
  }

  // ========================================
  // 16. 驗證 RPC 回傳格式
  // ========================================

  if (
    !bindingData ||
    typeof bindingData !== "object" ||
    Array.isArray(bindingData) ||
    typeof bindingData.success !== "boolean" ||
    typeof bindingData.code !== "string"
  ) {
    console.error(
      "統一身分綁定 RPC 回傳格式異常"
    );

    throw new Error(
      "身分驗證服務回應異常，請稍後再試"
    );
  }

  const binding =
    bindingData as IdentityBindingResult;

  // ========================================
  // 17. 處理統一身分驗證結果
  // ========================================

  if (binding.success === true) {
    if (
      binding.code !== "BOUND" &&
      binding.code !== "ALREADY_BOUND"
    ) {
      console.error(
        "統一身分驗證成功狀態異常"
      );

      throw new Error(
        "身分驗證服務回應異常，請稍後再試"
      );
    }

  } else {
    switch (binding.code) {
      // ====================================
      // 尚未啟用新身分綁定
      // ====================================

      case "BINDING_NOT_ENABLED":

        if (REQUIRE_IDENTITY_BINDING) {
          throw new Error(
            "尚未完成統一身分綁定，請聯絡管理員"
          );
        }

        // 安全遷移相容模式：
        // 暫時允許既有雙重驗證使用者。
        //
        // 不新增、不修改任何身分綁定資料。

        break;

      // ====================================
      // LINE、信箱或 Auth 帳號發生衝突
      // ====================================

      case "IDENTITY_CONFLICT":

        console.warn(
          "偵測到統一身分綁定衝突"
        );

        throw new Error(
          "LINE 帳號與校園信箱的綁定身分不一致，請聯絡管理員"
        );

      // ====================================
      // 校園信箱尚未驗證
      // ====================================

      case "EMAIL_NOT_VERIFIED":

      case "AUTH_USER_NOT_FOUND":

      case "INVALID_SCHOOL_EMAIL":

        throw new Error(
          "請先完成學校信箱驗證"
        );

      // ====================================
      // LINE 身分資料異常
      // ====================================

      case "INVALID_LINE_ID":

        throw new Error(
          "LINE 身分資料格式不正確"
        );

      // ====================================
      // 必要身分資料不完整
      // ====================================

      case "INVALID_IDENTITY":

        throw new Error(
          "登入身分資料不完整，請重新登入"
        );

      // ====================================
      // 未知 RPC 回傳結果
      // ====================================

      default:

        console.error(
          "統一身分綁定 RPC 回傳未知狀態"
        );

        throw new Error(
          "身分驗證服務回應異常，請稍後再試"
        );
    }
  }

  // ========================================
  // 18. 回傳已驗證身分
  //
  // 完整保留原本 API 回傳格式，
  // 避免影響其他既有 API。
  // ========================================

  return {
    admin,
    email,
    lineUserId,
  };
}
