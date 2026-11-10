
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
  return NextResponse.json({ error: message }, { status });
}

// 將商品圖片轉成 LINE 可以使用的公開網址
function getProductImageUrl(value: unknown): string | null {
  if (!value) return null;

  let raw: unknown = value;

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        raw = parsed[0];
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "url" in parsed
      ) {
        raw = parsed.url;
      }
    } catch {
      // 一般網址或圖片路徑
    }
  }

  if (Array.isArray(raw)) {
    raw = raw[0];
  }

  if (
    raw &&
    typeof raw === "object" &&
    "url" in raw
  ) {
    raw = raw.url;
  }

  if (typeof raw !== "string") return null;

  const clean = raw.trim();
  if (!clean) return null;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://arcapfqiihchltdhysea.supabase.co";

  let imageUrl: string;

  if (
    clean.startsWith("https://") ||
    clean.startsWith("http://")
  ) {
    imageUrl = clean;
  } else {
    imageUrl =
      supabaseUrl.replace(/\/$/, "") +
      "/storage/v1/object/public/product-images/" +
      clean.replace(/^\/+/, "");
  }

  try {
    const url = new URL(imageUrl);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

// 確認商品與賣家聯絡方式
async function findSellerContact(
  admin: any,
  productId: string,
  buyerLineUserId: string
) {
  const { data: product, error: productError } =
    await admin
      .from("products")
      .select("*")
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
      error: "賣家 LINE 連結格式不正確",
      status: 400,
    };
  }

  return {
    product,
    lineFriendUrl: contact.line_friend_url,
  };
}

// GET：讀取 LINE 聯絡連結
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
      return fail(result.error!, result.status);
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

// PUT：儲存賣家的 LINE 加好友連結
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
      (lineFriendUrl && !validLineUrl(lineFriendUrl))
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
        "此 LINE 帳號已綁定其他學校信箱",
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

// 建立 LINE 商品通知卡片
function createProductFlexMessage(
  product: any,
  productUrl: string
) {
  const name = String(
    product.name ?? "未命名商品"
  );

  const numericPrice = Number(product.price);

  const price =
    product.price !== null &&
    product.price !== undefined &&
    product.price !== "" &&
    Number.isFinite(numericPrice)
      ? `NT$ ${numericPrice.toLocaleString("zh-TW")}`
      : "請查看商品詳情";

  const imageUrl = getProductImageUrl(
    product.image_url || product.images
  );

  const bodyContents: any[] = [];

  // 第一部分：商品照片放最上方
  if (imageUrl) {
    bodyContents.push({
      type: "image",
      url: imageUrl,
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: productUrl,
      },
    });
  }

  // 第二部分：商品資訊
  bodyContents.push({
    type: "box",
    layout: "vertical",
    paddingAll: "18px",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: "🤝 收到買家購買意願通知！",
        color: "#3385FF",
        weight: "bold",
        size: "md",
        wrap: true,
      },
      {
        type: "text",
        text: name.slice(0, 100),
        weight: "bold",
        size: "xl",
        color: "#333333",
        wrap: true,
      },
      {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "預售價格：",
            size: "sm",
            color: "#777777",
            flex: 0,
          },
          {
            type: "text",
            text: price,
            size: "md",
            weight: "bold",
            color: "#E65C00",
            wrap: true,
          },
        ],
      },
      {
        type: "separator",
        margin: "md",
      },
      {
        type: "text",
        text: "有一位南臺同學對你的商品感興趣！",
        size: "sm",
        color: "#333333",
        wrap: true,
      },
      {
        type: "text",
        text:
          "對方剛剛點擊了「聯絡賣家」，" +
          "請留意近期是否有新的 LINE 好友邀請。",
        size: "sm",
        color: "#666666",
        wrap: true,
      },
      {
        type: "text",
        text: "資想聽你說｜自動通知",
        size: "xs",
        color: "#999999",
        wrap: true,
      },
    ],
  });

  return {
    type: "flex",
    altText:
      `🤝 收到買家購買意願通知！${name}`.slice(
        0,
        400
      ),
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "0px",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#D35400",
            action: {
              type: "uri",
              label: "查看商品",
              uri: productUrl,
            },
          },
        ],
      },
    },
  };
}

// POST：買家聯絡賣家並發送 LINE 通知
export async function POST(req: NextRequest) {
  try {
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

    const result = await findSellerContact(
      admin,
      productId,
      lineUserId
    );

    if ("error" in result) {
      return fail(result.error!, result.status);
    }

    const product = result.product!;
    const lineFriendUrl = result.lineFriendUrl!;

    // LINE 通知失敗不影響買家聯絡賣家
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
        // 保留原本 30 分鐘通知限制
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
          const productUrl =
            `${req.nextUrl.origin}/products/` +
            encodeURIComponent(String(product.id));

          const flexMessage =
            createProductFlexMessage(
              product,
              productUrl
            );

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
                messages: [flexMessage],
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
                "更新通知紀錄失敗:",
                updateError
              );
            }
          } else {
            const errorText =
              await response.text().catch(() => "");

            console.error(
              "LINE Flex 推播失敗:",
              response.status,
              errorText
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

    // 保留原本 LINE 加好友跳轉功能
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
