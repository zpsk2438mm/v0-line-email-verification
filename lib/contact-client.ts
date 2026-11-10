
import { supabase } from "@/lib/supabase";

export async function contactRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object
) {
  // 確認 API 路徑正確
  if (!path.startsWith("/api/")) {
    throw new Error("API 路徑格式不正確");
  }

  // 取得 Supabase 學校信箱驗證憑證
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      "讀取學校信箱驗證狀態失敗：" +
        sessionError.message
    );
  }

  if (!session?.access_token) {
    throw new Error(
      "請先完成學校信箱驗證"
    );
  }

  // 取得 LINE 登入憑證
  const { default: liff } = await import("@line/liff");

  let idToken: string | null = null;

  try {
    idToken = liff.getIDToken();
  } catch (error) {
    console.error(
      "取得 LINE ID Token 失敗:",
      error
    );

    throw new Error(
      "LINE 登入憑證讀取失敗，請重新登入 LINE"
    );
  }

  if (!idToken) {
    throw new Error(
      "無法取得 LINE 登入憑證，請重新登入 LINE（LIFF 需啟用 openid scope）"
    );
  }

  // 向網站後端發送請求
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        Authorization:
          `Bearer ${session.access_token}`,
        "X-Line-ID-Token": idToken,
        "Content-Type": "application/json",
      },
      body:
        body && method !== "GET"
          ? JSON.stringify(body)
          : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "API 網路請求失敗:",
      error
    );

    throw new Error(
      "無法連線至網站伺服器，請檢查網路連線後再試"
    );
  }

  // 讀取後端回應
  const responseText = await response.text();

  let result: any = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `伺服器回應格式不正確（HTTP ${response.status}）`
      );
    }
  }

  if (!response.ok) {
    const message =
      typeof result.error === "string"
        ? result.error
        : "操作失敗";

    throw new Error(
      `${message}（HTTP ${response.status}）`
    );
  }

  return result;
}
