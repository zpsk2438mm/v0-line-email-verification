
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 檢查是否為允許的 LINE 加好友網址
function isValidLineUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    // LINE 個人加好友連結
    if (
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/")
    ) {
      return true;
    }

    // LINE 短連結
    if (url.hostname === "lin.ee") {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// GET：取得自己的或指定賣家的聯絡連結
export async function GET(req: NextRequest) {
  try {
    const { admin, lineUserId } =
      await verifiedIdentity(req);

    const sellerId =
      req.nextUrl.searchParams.get("sellerId") ||
      lineUserId;

    const { data, error } = await admin
      .from("seller_contacts")
      .select("line_friend_url")
      .eq("line_user_id", sellerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      lineFriendUrl: data?.line_friend_url || "",
    });
  } catch (err) {
    console.error("讀取 LINE 聯絡資料失敗:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "讀取聯絡資料失敗",
      },
      { status: 401 }
    );
  }
}

// PUT：只有本人可以修改自己的 LINE 連結
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
        !isValidLineUrl(lineFriendUrl))
    ) {
      return NextResponse.json(
        {
          error:
            "請輸入有效的 LINE 加好友連結",
        },
        { status: 400 }
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

    if (error) {
      console.error("Supabase 儲存失敗:", error);

      return NextResponse.json(
        { error: "儲存失敗，請檢查資料庫設定" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lineFriendUrl,
    });
  } catch (err) {
    console.error("更新 LINE 聯絡資料失敗:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "更新聯絡資料失敗",
      },
      { status: 401 }
    );
  }
}
