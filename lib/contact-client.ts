
import { supabase } from "@/lib/supabase";

export async function contactRequest(
  path: string,
  method: "GET" | "PUT" = "GET",
  body?: object
) {
  // 取得 Supabase 學校信箱驗證憑證
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("請先驗證學校信箱");
  }

  // 取得 LINE 登入憑證
  const { default: liff } = await import("@line/liff");

  const idToken = liff.getIDToken();

  if (!idToken) {
    throw new Error(
      "無法取得 LINE 登入憑證，請重新登入 LINE（LIFF 需啟用 openid scope）"
    );
  }

  // 向網站後端發送請求
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Line-ID-Token": idToken,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "操作失敗");
  }

  return result;
}
