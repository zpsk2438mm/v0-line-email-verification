
import "server-only";

import { NextRequest } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

// ==========================================
// 管理員授權錯誤
// ==========================================

export class AdminAuthError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);

    this.name = "AdminAuthError";
    this.status = status;
  }
}

// ==========================================
// 共用管理員授權機制
// ==========================================

export async function verifiedAdmin(
  req: NextRequest
) {
  let identity: Awaited<
    ReturnType<typeof verifiedIdentity>
  >;

  // 1. 驗證 LINE 與校園信箱

  try {
    identity = await verifiedIdentity(req);

  } catch (error: unknown) {
    throw new AdminAuthError(
      error instanceof Error
        ? error.message
        : "請重新登入並完成身分驗證",
      401
    );
  }

  const {
    admin,
    authUserId,
    lineUserId,
    email,
  } = identity;

  // 2. 查詢正式管理員授權
  //
  // 必須同時符合：
  //
  // Auth User ID
  // LINE User ID
  // 已驗證校園信箱
  // is_active = true

  const {
    data: permission,
    error,
  } = await admin
    .from("admin_identity_permissions")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .eq("line_user_id", lineUserId)
    .eq("verified_email", email)
    .eq("is_active", true)
    .maybeSingle();

  // 資料庫查詢失敗時禁止操作

  if (error) {
    console.error(
      "[Admin Auth] 管理員授權查詢失敗",
      {
        code: error.code,
      }
    );

    throw new AdminAuthError(
      "管理員授權服務暫時無法使用",
      503
    );
  }

  // 3. 不符合任一授權條件

  if (!permission) {
    console.warn(
      "[Admin Auth] 拒絕未授權的管理員操作"
    );

    throw new AdminAuthError(
      "你沒有管理員權限",
      403
    );
  }

  // 4. 回傳已驗證管理員身分
  //
  // 目前正式身分綁定仍處於遷移模式。
  // 待全面啟用後，由 verifiedIdentity
  // 統一強制要求正式綁定。

  return identity;
}
