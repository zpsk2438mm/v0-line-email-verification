
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function verifiedIdentity(req: NextRequest) {
  // 取得 Supabase 與 LINE 的登入憑證
  const bearer = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  const idToken = req.headers.get("x-line-id-token");

  // 取得環境變數
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const channel = process.env.LINE_LOGIN_CHANNEL_ID;

  if (
    !bearer ||
    !idToken ||
    !url ||
    !anon ||
    !service ||
    !channel
  ) {
    throw new Error("缺少登入憑證或伺服器環境變數");
  }

  // 驗證 Supabase 登入狀態
  const auth = createClient(url, anon, {
    auth: {
      persistSession: false,
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

  // 向 LINE 官方伺服器驗證 ID Token
  const response = await fetch(
    "https://api.line.me/oauth2/v2.1/verify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channel,
      }),
      cache: "no-store",
    }
  );

  const line = await response.json();

  if (
    !response.ok ||
    !line.sub ||
    line.aud !== channel
  ) {
    throw new Error("LINE 身分驗證失敗");
  }

  // 建立僅供後端使用的 Supabase 管理連線
  const admin = createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    admin,
    email: user.email.toLowerCase(),
    lineUserId: line.sub as string,
  };
}
