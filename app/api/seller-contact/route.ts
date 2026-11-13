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

      // 優先使用已綁定的 Messaging ID
      // 未綁定則嘗試使用舊版商品 LINE ID
      const recipientLineId =
        binding?.messaging_user_id ||
        product.line_user_id;

      if (recipientLineId && accessToken) {
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
                to: recipientLineId,
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
                .eq(
                  "product_id",
                  String(product.id)
                )
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
