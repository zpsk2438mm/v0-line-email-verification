
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
    value.startsWith("/\\")
  ) {
    return null;
  }

  if (/[\r\n\\]/.test(value)) {
    return null;
  }

  return value;
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
  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

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

  const extractNameFromEmail = (
    email: string | null
  ) => {
    if (!email) return null;

    return email.split("@")[0].toUpperCase();
  };

  // LINE 登入
  const login = useCallback(() => {
    if (!liffInstance) {
      console.warn(
        "LIFF 尚未初始化，無法登入"
      );
      return;
    }

    if (liffInstance.isLoggedIn()) {
      return;
    }

    try {
      // 記住登入前想前往的頁面
      const params = new URLSearchParams(
        window.location.search
      );

      const requested = safeInternalPath(
        params.get("next")
      );

      if (requested) {
        sessionStorage.setItem(
          LOGIN_NEXT_KEY,
          requested
        );
      } else if (
        window.location.pathname !== "/"
      ) {
        const current = safeInternalPath(
          window.location.pathname +
            window.location.search
        );

        if (current) {
          sessionStorage.setItem(
            LOGIN_NEXT_KEY,
            current
          );
        }
      }

      if (liffInstance.isInClient()) {
        liffInstance.login();
      } else {
        // 使用已設定成功的正式網址
        // 避免 LINE 400 Bad Request
        liffInstance.login({
          redirectUri: PRODUCTION_HOME,
        });
      }
    } catch (err) {
      console.error(
        "LINE 登入啟動失敗:",
        err
      );
    }
  }, [liffInstance]);

  // 同時登出學校信箱與 LINE
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

    if (liffInstance?.isLoggedIn()) {
      try {
        liffInstance.logout();
      } catch (err) {
        console.error(
          "LINE LIFF 登出失敗:",
          err
        );

        throw new Error(
          "LINE 登出失敗，請重新整理後再試。"
        );
      }
    }

    // 清除登入快取
    localStorage.removeItem(
      "stust_authenticated"
    );

    localStorage.removeItem(
      "line_user_id"
    );

    sessionStorage.removeItem(
      LOGIN_NEXT_KEY
    );

    // 清除使用者資料
    setIsAuthenticated(false);
    setUserEmail(null);
    setLineUserId(null);
    setUserProfile(null);
    setUserName(null);

    window.location.replace("/");
  }, [liffInstance]);

  // 初始化 Supabase 與 LINE
  useEffect(() => {
    let isMounted = true;

    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    async function initAuthAndLiff() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted) {
          const email =
            session?.user.email ?? null;

          setUserEmail(email);

          setUserName(
            extractNameFromEmail(email)
          );

          setIsAuthenticated(
            email
              ?.toLowerCase()
              .endsWith("@stust.edu.tw") ??
              false
          );
        }

        // 監聽學校信箱登入狀態
        const authListener =
          supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (!isMounted) return;

              const email =
                session?.user.email ?? null;

              setUserEmail(email);

              setUserName(
                extractNameFromEmail(email)
              );

              setIsAuthenticated(
                email
                  ?.toLowerCase()
                  .endsWith("@stust.edu.tw") ??
                  false
              );
            }
          );

        subscription =
          authListener.data.subscription;

        // 初始化 LINE LIFF
        if (
          LIFF_ID &&
          typeof window !== "undefined"
        ) {
          const { default: liff } =
            await import("@line/liff");

          await liff.init({
            liffId: LIFF_ID,
          });

          if (isMounted) {
            setLiffInstance(liff);
          }

          if (liff.isLoggedIn()) {
            const profile =
              await liff.getProfile();

            if (isMounted) {
              setLineUserId(
                profile.userId
              );

              setUserProfile(profile);
            }
          } else {
            console.log(
              "LINE LIFF 初始化成功，等待手動登入。"
            );
          }
        } else {
          console.warn(
            "尚未設定 NEXT_PUBLIC_LIFF_ID"
          );
        }
      } catch (err) {
        console.error(
          "LINE / Supabase 初始化失敗:",
          err
        );
      } finally {
        if (isMounted) {
          setIsLiffInit(true);
          setIsLoading(false);
        }
      }
    }

    void initAuthAndLiff();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // 發送學校信箱驗證碼
  const sendOtp = async (
    email: string
  ) => {
    try {
      const { error } =
        await supabase.auth.signInWithOtp({
          email,
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error:
          err?.message ||
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
      const { data, error } =
        await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        const verifiedEmail =
          data.session.user.email ??
          null;

        setUserEmail(verifiedEmail);

        setUserName(
          extractNameFromEmail(
            verifiedEmail
          )
        );

        setIsAuthenticated(
          verifiedEmail
            ?.toLowerCase()
            .endsWith("@stust.edu.tw") ??
            false
        );

        return {
          success: true,
        };
      }

      return {
        success: false,
        error:
          "驗證成功，但未能建立安全工作階段",
      };
    } catch (err: any) {
      return {
        success: false,
        error:
          err?.message ||
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
