
import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHash } from "crypto";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashCode(code: string): string {
  return createHash("sha256")
    .update(code)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    // 確認已完成 LINE 與學校信箱驗證
    const { admin, email, lineUserId } =
      await verifiedIdentity(req);

    // 先檢查是否已綁定官方帳號
    const { data: existing, error: lookupError } =
      await admin
        .from("line_notification_bindings")
        .select("messaging_user_id")
        .eq("line_login_user_id", lineUserId)
        .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyBound: true,
        message: "你已經綁定 LINE 商品通知",
      });
    }

    // 產生隨機 6 位數綁定碼
    const code = randomInt(
      100000,
      1000000
    ).toString();

    // 資料庫只儲存雜湊值，不儲存明文
    const codeHash = hashCode(code);

    // 10 分鐘後過期
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    // 清除目前使用者之前尚未使用的綁定碼
    const { error: deleteError } = await admin
      .from("line_binding_codes")
      .delete()
      .eq("line_login_user_id", lineUserId)
      .is("used_at", null);

    if (deleteError) throw deleteError;

    // 儲存新的綁定碼
    const { error: insertError } = await admin
      .from("line_binding_codes")
      .insert({
        code_hash: codeHash,
        line_login_user_id: lineUserId,
        verified_email: email,
        expires_at: expiresAt,
      });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      alreadyBound: false,
      code,
      expiresAt,
      message:
        "請在 10 分鐘內將綁定碼傳送給「資想聽你說」官方帳號",
    });
  } catch (err) {
    console.error("產生 LINE 綁定碼失敗:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "產生綁定碼失敗",
      },
      { status: 401 }
    );
  }
}
