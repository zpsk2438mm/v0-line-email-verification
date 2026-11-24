
import { supabase } from "@/lib/supabase";

function isTokenExpired(
  token: string | null
): boolean {
  if (!token) return true;

  try {
    const payload = token
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(
      window.atob(payload)
    );

    return (
      typeof decoded.exp !== "number" ||
      decoded.exp * 1000 <= Date.now()
    );
  } catch {
    return true;
  }
}

function notifyLineExpired() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new Event("stust:line-expired")
  );
}

export async function contactRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object
) {
  // 防止登入憑證被傳送至外部網址
  if (
    !path.startsWith("/api/") ||
    /[\r\n\\]/.test(path)
  ) {
    throw new Error("不合法的 API 路徑");
  }

  // 取得學校信箱驗證憑證
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
  const { default: liff } =
    await import("@line/liff");

  if (!liff.isLoggedIn()) {
    notifyLineExpired();

    throw new Error(
      "LINE 尚未登入，請重新登入 LINE"
    );
  }

  const idToken = liff.getIDToken();

  if (!idToken || isTokenExpired(idToken)) {
    notifyLineExpired();

    throw new Error(
      "LINE 登入憑證已過期，請重新登入 LINE。" +
      "學校信箱驗證仍會保留至原工作階段到期。"
    );
  }

  // 發送 API 請求
  const response = await fetch(path, {
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

  // 解析伺服器回應
  const responseText =
    await response.text();

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
      typeof result?.error === "string"
        ? result.error
        : "操作失敗";

    // 只在確認是 LINE 憑證問題時更新狀態
    // 不因一般 API 錯誤清除登入
    if (
      response.status === 401 &&
      (
        message.includes("LINE 登入憑證已過期") ||
        message.includes("無法取得 LINE 登入憑證")
      )
    ) {
      notifyLineExpired();
    }

    throw new Error(
      `${message}（HTTP ${response.status}）`
    );
  }

  return result;
}
