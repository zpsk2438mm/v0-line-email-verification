
import { supabase } from "@/lib/supabase";

export async function contactRequest(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: object
) {
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
    throw new Error("請先完成學校信箱驗證");
  }

  // 取得 LINE 登入憑證
  const { default: liff } = await import("@line/liff");

  const idToken = liff.getIDToken();

  if (!idToken) {
    throw new Error(
      "無法取得 LINE 登入憑證，請重新登入 LINE"
    );
  }

  // 發送 API 請求
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
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
    throw new Error(
      `${result.error || "操作失敗"}（HTTP ${response.status}）`
    );
  }

  return result;
}
