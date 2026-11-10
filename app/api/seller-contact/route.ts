
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validLineUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function fail(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

// GET：讀取自己的連結，或透過商品 ID 取得賣家連結
export async function GET(req: NextRequest) {
  try {
    const { admin, email, lineUserId } =
      await verifiedIdentity(req);

    const productId =
      req.nextUrl.searchParams.get("productId");

    // 沒有 productId：只能讀取自己的設定
    if (!productId) {
      const { data, error } = await admin
        .from("seller_contacts")
        .select("line_friend_url")
        .eq("line_user_id", lineUserId)
        .eq("verified_email", email)
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({
        lineFriendUrl: data?.line_friend_url ?? "",
      });
    }

    // 有 productId：先確認商品確實存在且已上架
    const { data: product, error: productError } =
      await admin
        .from("products")
        .select("id, status, line_user_id")
        .eq("id", productId)
        .eq("status", "approved")
        .maybeSingle();

    if (productError) throw productError;

    if (!product) {
      return fail(
        "商品不存在或尚未通過審核",
        404
      );
    }

    if (!product.line_user_id) {
      return fail("商品缺少賣家資料", 404);
    }

    if (product.line_user_id === lineUserId) {
      return fail("這是你自己的商品", 400);
    }

    // 只能取得該商品真正賣家的聯絡連結
    const { data, error } = await admin
      .from("seller_contacts")
      .select("line_friend_url")
      .eq("line_user_id", product.line_user_id)
      .maybeSingle();

    if (error) throw error;

    if (!data?.line_friend_url) {
      return fail(
        "賣家尚未設定 LINE 加好友連結",
        404
      );
    }

    if (!validLineUrl(data.line_friend_url)) {
      return fail(
        "賣家聯絡連結格式不正確",
        400
      );
    }

    return NextResponse.json({
      lineFriendUrl: data.line_friend_url,
    });
  } catch (err) {
    console.error("seller-contact GET:", err);

    return fail(
      err instanceof Error
        ? err.message
        : "讀取聯絡資料失敗",
      401
    );
  }
}

// PUT：只能修改自己的 LINE 加好友連結
export async function PUT(req: NextRequest) {
  try {
    const { admin, email, lineUserId } =
      await verifiedIdentity(req);

    const body = await req.json();

    const lineFriendUrl =
      typeof body.lineFriendUrl === "string"
        ? body.lineFriendUrl.trim()
        : "";

    if (
      lineFriendUrl.length > 500 ||
      (lineFriendUrl &&
        !validLineUrl(lineFriendUrl))
    ) {
      return fail(
        "請輸入有效的 LINE 加好友連結（https://line.me/ti/p/...）"
      );
    }

    // 避免同一個 LINE 帳號被不同學校信箱覆蓋
    const { data: existing, error: lookupError } =
      await admin
        .from("seller_contacts")
        .select("verified_email")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

    if (lookupError) throw lookupError;

    if (
      existing &&
      existing.verified_email !== email
    ) {
      return fail(
        "此 LINE 帳號已綁定其他學校信箱，請聯絡管理員",
        409
      );
    }

    const { error } = await admin
      .from("seller_contacts")
      .upsert(
        {
          line_user_id: lineUserId,
          verified_email: email,
          line_friend_url: lineFriendUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "line_user_id",
        }
      );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      lineFriendUrl,
    });
  } catch (err) {
    console.error("seller-contact PUT:", err);

    return fail(
      err instanceof Error
        ? err.message
        : "儲存聯絡資料失敗",
      401
    );
  }
}
