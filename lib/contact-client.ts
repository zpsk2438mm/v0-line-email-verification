
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

// 查詢商品及賣家聯絡方式
async function findSellerContact(
  admin: any,
  productId: string,
  buyerLineUserId: string
) {
  const { data: product, error: productError } =
    await admin
      .from("products")
      .select("id, status, line_user_id")
      .eq("id", productId)
      .eq("status", "approved")
      .maybeSingle();

  if (productError) throw productError;

  if (!product) {
    return {
      error: "商品不存在或尚未通過審核",
      status: 404,
    };
  }

  if (!product.line_user_id) {
    return {
      error: "商品缺少賣家資料",
      status: 404,
    };
  }

  if (product.line_user_id === buyerLineUserId) {
    return {
      error: "無法聯絡自己刊登的商品",
      status: 400,
    };
  }

  const { data: contact, error: contactError } =
    await admin
      .from("seller_contacts")
      .select("line_friend_url")
      .eq("line_user_id", product.line_user_id)
      .maybeSingle();

  if (contactError) throw contactError;

  if (!contact?.line_friend_url) {
    return {
      error: "賣家尚未設定 LINE 加好友連結",
      status: 404,
    };
  }

  if (!validLineUrl(contact.line_friend_url)) {
    return {
      error: "賣家的 LINE 連結格式不正確",
      status: 400,
    };
  }

  return {
    product,
    lineFriendUrl: contact.line_friend_url,
  };
}

// GET：保留原本查詢 LINE 聯絡方式功能
export async function GET(req: NextRequest) {
  try {
    const { admin, email, lineUserId } =
      await verifiedIdentity(req);

    const productId =
      req.nextUrl.searchParams.get("productId");

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

    const result = await findSellerContact(
      admin,
      productId,
      lineUserId
    );

    if ("error" in result) {
      return fail(
        result.error!,
        result.status
      );
    }

    return NextResponse.json({
      lineFriendUrl: result.lineFriendUrl,
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

// PUT：保留原本設定賣家 LINE 連結功能
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

// POST：買家聯絡賣家，並嘗試發送 LINE 通知
export async function POST(req: NextRequest) {
  try {
    // 驗證買家身分
    const { admin, lineUserId } =
      await verifiedIdentity(req);

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return fail("請提供有效的商品資料");
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("productId" in body) ||
      typeof body.productId !== "string" ||
      !body.productId.trim()
    ) {
      return fail("缺少商品 ID");
    }

    const productId = body.productId.trim();

    // 查詢商品及賣家聯絡連結
    const result = await findSellerContact(
      admin,
      productId,
      lineUserId
    );

    if ("error" in result) {
      return fail(
        result.error!,
        result.status
      );
    }

    const product = result.product!;
    const lineFriendUrl = result.lineFriendUrl!;

    // 通知功能不能影響買家聯絡賣家
    try {
      const { data: binding, error: bindingError } =
        await admin
          .from("line_notification_bindings")
          .select("messaging_user_id")
          .eq(
            "line_login_user_id",
            product.line_user_id
          )
          .maybeSingle();

      if (bindingError) throw bindingError;

      const accessToken =
        process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

      if (binding?.messaging_user_id && accessToken) {
        // 檢查 30 分鐘通知限制
        const { data: claimed, error: claimError } =
          await admin.rpc(
            "claim_line_contact_notification",
            {
              p_product_id: String(product.id),
              p_buyer_line_user_id: lineUserId,
              p_seller_line_user_id:
                product.line_user_id,
            }
          );

        if (claimError) throw claimError;

        if (claimed === true) {
          const message =
            "🔔 南臺二手物平台｜商品聯絡通知\n\n" +
            "有一位南臺同學對你的商品感興趣！\n\n" +
            "對方剛剛點擊了「聯絡賣家」。\n\n" +
            "請留意近期是否有新的 LINE 好友邀請。\n\n" +
            "此訊息由「資想聽你說」自動發送。";

          const response = await fetch(
            "https://api.line.me/v2/bot/message/push",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: binding.messaging_user_id,
                messages: [
                  {
                    type: "text",
                    text: message,
                  },
                ],
              }),
              signal: AbortSignal.timeout(5000),
            }
          );

          if (response.ok) {
            const { error: updateError } =
              await admin
                .from("line_contact_notifications")
                .update({
                  last_sent_at:
                    new Date().toISOString(),
                })
                .eq("product_id", String(product.id))
                .eq(
                  "buyer_line_user_id",
                  lineUserId
                );

            if (updateError) {
              console.error(
                "更新 LINE 通知紀錄失敗:",
                updateError
              );
            }
          } else {
            console.error(
              "LINE 推播失敗:",
              response.status
            );
          }
        }
      }
    } catch (notificationError) {
      console.error(
        "LINE 通知處理失敗:",
        notificationError
      );
    }

    // 不論通知成功與否，都回傳賣家連結
    return NextResponse.json({
      success: true,
      lineFriendUrl,
    });
  } catch (err) {
    console.error("seller-contact POST:", err);

    return fail(
      err instanceof Error
        ? err.message
        : "聯絡賣家失敗",
      401
    );
  }
}
