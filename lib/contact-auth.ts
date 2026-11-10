
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function verifiedIdentity(req: NextRequest) {
  // 取得 Supabase 與 LINE 登入憑證
  const bearer = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  const idToken = req.headers.get("x-line-id-token");

  // 環境變數
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const channel = process.env.LINE_LOGIN_CHANNEL_ID?.trim();

  if (!url || !anon || !service || !channel) {
    console.error("伺服器缺少必要環境變數");
    throw new Error("伺服器設定不完整，請聯絡管理員");
  }

  if (!bearer) {
    throw new Error("請先完成學校信箱驗證");
  }

  if (!idToken) {
    throw new Error(
      "無法取得 LINE 登入憑證，請重新登入 LINE"
    );
  }

  // 驗證 Supabase 使用者
  const auth = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await auth.auth.getUser(bearer);

  if (
    error ||
    !user?.email?.toLowerCase().endsWith("@stust.edu.tw")
  ) {
    throw new Error("請先完成學校信箱驗證");
  }

  // 向 LINE 官方驗證 ID Token
  let response: Response;

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
      }
    );
  } catch {
    throw new Error(
      "無法連線至 LINE 驗證服務，請稍後再試"
    );
  }

  const line = await response.json().catch(() => null);

  if (!response.ok) {
    // 只記錄錯誤代碼，不記錄 Token
    console.error("LINE ID Token 驗證失敗", {
      status: response.status,
      error: line?.error,
      description: line?.error_description,
    });

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

  if (!line?.sub || !line?.aud) {
    console.error("LINE 驗證回應缺少必要欄位");
    throw new Error("LINE 身分資料不完整");
  }

  if (String(line.aud) !== channel) {
    console.error("LINE Channel ID 不一致");
    throw new Error(
      "LINE Channel ID 與登入憑證不符"
    );
  }

  // 建立 Supabase 後端管理連線
  const admin = createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    admin,
    email: user.email.toLowerCase(),
    lineUserId: String(line.sub),
  };
}
