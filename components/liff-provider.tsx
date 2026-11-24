
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

const PRODUCTION_HOME =
  "https://v0-supabase-form-integration-two.vercel.app/";

const LOGIN_NEXT_KEY = "login_next";

function safeInternalPath(
  value: string | null
): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\r\n\\]/.test(value)
  ) {
    return null;
  }

  return value;
}

function extractNameFromEmail(email: string | null) {
  return email
    ? email.split("@")[0].toUpperCase()
    : null;
}

function getLoginTarget() {
  const params = new URLSearchParams(
    window.location.search
  );

  const requested = safeInternalPath(
    params.get("next")
  );

  if (requested) return requested;

  if (window.location.pathname !== "/") {
    return (
      safeInternalPath(
        window.location.pathname +
          window.location.search +
          window.location.hash
      ) || "/"
    );
  }

  return (
    safeInternalPath(
      sessionStorage.getItem(LOGIN_NEXT_KEY)
    ) || "/"
  );
}

function isTokenExpired(token: string | null) {
  if (!token) return true;

  try {
    const payload = token.split(".")[1];

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(
      window.atob(normalized)
    );

    return (
      typeof decoded.exp !== "number" ||
      decoded.exp * 1000 <= Date.now()
    );
  } catch {
    return true;
  }
}

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: any | null;
  userName: string | null;
  isLiffInit: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  sendOtp: (
    email: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  verifyOtp: (
    email: string,
    token: string
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null,
  userName: null,
  isLiffInit: false,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  sendOtp: async () => ({
    success: false,
  }),
  verifyOtp: async () => ({
    success: false,
  }),
});

export const useLiff = () =>
  useContext(LiffContext);

export function LiffProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [userEmail, setUserEmail] =
    useState<string | null>(null);

  const [lineUserId, setLineUserId] =
    useState<string | null>(null);

  const [userProfile, setUserProfile] =
    useState<any | null>(null);

  const [userName, setUserName] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isLiffInit, setIsLiffInit] =
    useState(false);

  const [liffInstance, setLiffInstance] =
    useState<any>(null);

  const [lineExpired, setLineExpired] =
    useState(false);

  // 清除 LINE 顯示狀態
  // 不清除 Supabase 學校信箱工作階段
  const clearLineState = useCallback(() => {
    setLineUserId(null);
    setUserProfile(null);
  }, []);

  // 同步學校信箱登入狀態
  const syncSchoolSession = useCallback(
    (email: string | null) => {
      setUserEmail(email);

      setUserName(
        extractNameFromEmail(email)
      );

      setIsAuthenticated(
        email
          ?.toLowerCase()
          .endsWith("@stust.edu.tw") ?? false
      );
    },
    []
  );

  // LINE 登入
  const login = useCallback(() => {
    if (!liffInstance) {
      alert(
        "LINE 登入服務尚未初始化，請重新整理後再試。"
      );
      return;
    }

    try {
      const target = getLoginTarget();

      sessionStorage.setItem(
        LOGIN_NEXT_KEY,
        target
      );

      const loginPage =
        target === "/"
          ? "/"
          : `/?next=${encodeURIComponent(target)}`;

      const hasValidLineToken =
        liffInstance.isLoggedIn() &&
        !lineExpired &&
        !isTokenExpired(
          liffInstance.getIDToken()
        );

      // LINE 已登入
      if (hasValidLineToken) {
        // 尚未完成學校信箱驗證
        if (!isAuthenticated) {
          window.location.assign(loginPage);
          return;
        }

        // LINE 與學校信箱都已完成
        window.location.assign(target);
        return;
      }

      // 憑證過期時重新登入 LINE
      if (liffInstance.isLoggedIn()) {
        if (liffInstance.isInClient()) {
          alert(
            "LINE 登入憑證已過期，請關閉目前頁面，" +
            "再從 LINE 官方帳號重新開啟市集。"
          );
          return;
        }

        liffInstance.logout();
      }

      clearLineState();

      if (liffInstance.isInClient()) {
        liffInstance.login();
      } else {
        liffInstance.login({
          redirectUri: PRODUCTION_HOME,
        });
      }
    } catch (error) {
      console.error(
        "LINE 登入啟動失敗:",
        error
      );

      alert(
        "LINE 登入失敗，請重新整理後再試。"
      );
    }
  }, [
    liffInstance,
    isAuthenticated,
    lineExpired,
    clearLineState,
  ]);

  // 完整登出
  const logout = useCallback(async () => {
    const { error } =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (error) {
      console.error(
        "Supabase 登出失敗:",
        error
      );

      throw new Error(
        "學校信箱登出失敗，請稍後再試。"
      );
    }

    syncSchoolSession(null);

    if (
      liffInstance?.isLoggedIn() &&
      !liffInstance.isInClient()
    ) {
      try {
        liffInstance.logout();
      } catch (error) {
        console.error(
          "LINE 登出失敗:",
          error
        );

        throw new Error(
          "LINE 登出失敗，請重新整理後再試。"
        );
      }
    }

    localStorage.removeItem(
      "stust_authenticated"
    );

    localStorage.removeItem(
      "line_user_id"
    );

    sessionStorage.removeItem(
      LOGIN_NEXT_KEY
    );

    clearLineState();

    setLineExpired(false);

    window.location.replace("/products");
  }, [
    liffInstance,
    clearLineState,
    syncSchoolSession,
  ]);

  // 初始化 LINE 與 Supabase
  useEffect(() => {
    let isMounted = true;

    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    async function initAuthAndLiff() {
      try {
        // 監聽學校信箱工作階段
        const authListener =
          supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (!isMounted) return;

              syncSchoolSession(
                session?.user.email ?? null
              );
            }
          );

        subscription =
          authListener.data.subscription;

        // 讀取既有工作階段
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "讀取學校信箱工作階段失敗:",
            sessionError.message
          );
        }

        if (isMounted && !sessionError) {
          syncSchoolSession(
            session?.user.email ?? null
          );
        }

        if (!LIFF_ID) {
          throw new Error(
            "尚未設定 NEXT_PUBLIC_LIFF_ID"
          );
        }

        const { default: liff } =
          await import("@line/liff");

        await liff.init({
          liffId: LIFF_ID,
        });

        if (!isMounted) return;

        setLiffInstance(liff);
        setIsLiffInit(true);

        if (liff.isLoggedIn()) {
          const idToken = liff.getIDToken();

          if (isTokenExpired(idToken)) {
            setLineExpired(true);
            clearLineState();
            return;
          }

          // 優先取得 ID Token 中的使用者資料
          const decoded =
            liff.getDecodedIDToken();

          if (decoded?.sub) {
            setLineUserId(decoded.sub);

            setUserProfile({
              userId: decoded.sub,
              displayName: decoded.name,
              pictureUrl: decoded.picture,
            });
          }

          // 補充完整 LINE 個人資料
          try {
            const profile =
              await liff.getProfile();

            if (isMounted) {
              setLineUserId(profile.userId);
              setUserProfile(profile);
              setLineExpired(false);
            }
          } catch (profileError) {
            // 暫時網路錯誤不直接清除登入狀態
            console.warn(
              "LINE 個人資料讀取失敗:",
              profileError
            );
          }
        } else {
          clearLineState();
        }
      } catch (error) {
        console.error(
          "LINE / Supabase 初始化失敗:",
          error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initAuthAndLiff();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [
    syncSchoolSession,
    clearLineState,
  ]);

  // 定期確認 LINE 憑證是否仍有效
  useEffect(() => {
    if (!liffInstance) return;

    function checkLineSession() {
      try {
        if (
          !liffInstance.isLoggedIn() ||
          isTokenExpired(
            liffInstance.getIDToken()
          )
        ) {
          setLineExpired(true);
          clearLineState();
        }
      } catch (error) {
        console.warn(
          "LINE 登入狀態檢查失敗:",
          error
        );
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        checkLineSession();
      }
    }

    function handleExpiredEvent() {
      setLineExpired(true);
      clearLineState();
    }

    const timer = window.setInterval(
      checkLineSession,
      60000
    );

    window.addEventListener(
      "focus",
      checkLineSession
    );

    window.addEventListener(
      "stust:line-expired",
      handleExpiredEvent
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        checkLineSession
      );

      window.removeEventListener(
        "stust:line-expired",
        handleExpiredEvent
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    liffInstance,
    clearLineState,
  ]);

  // 發送學校信箱驗證碼
  const sendOtp = async (email: string) => {
    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      if (
        !normalizedEmail.endsWith(
          "@stust.edu.tw"
        )
      ) {
        throw new Error(
          "請使用南臺科技大學學校信箱。"
        );
      }

      const { error } =
        await supabase.auth.signInWithOtp({
          email: normalizedEmail,
        });

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          "驗證碼發送失敗",
      };
    }
  };

  // 驗證學校信箱 OTP
  const verifyOtp = async (
    email: string,
    token: string
  ) => {
    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      if (
        !normalizedEmail.endsWith(
          "@stust.edu.tw"
        )
      ) {
        throw new Error(
          "請使用南臺科技大學學校信箱。"
        );
      }

      const { data, error } =
        await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: token.trim(),
          type: "email",
        });

      if (error) throw error;

      if (data.session) {
        const verifiedEmail =
          data.session.user.email ?? null;

        syncSchoolSession(verifiedEmail);

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          "驗證成功，但未能建立安全工作階段",
      };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          "驗證碼錯誤，請重新輸入",
      };
    }
  };

  return (
    <LiffContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        lineUserId,
        userProfile,
        userName,
        isLiffInit,
        isLoading,
        login,
        logout,
        sendOtp,
        verifyOtp,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#D35400]" />

          <p className="text-sm font-bold tracking-wider text-slate-500">
            正在安全同步南臺市集資料...
          </p>
        </div>
      ) : (
        children
      )}
    </LiffContext.Provider>
  );
}
