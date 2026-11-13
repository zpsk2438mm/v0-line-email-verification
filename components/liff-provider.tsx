
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

// LINE Developers 的 LIFF ID
const LIFF_ID =
  process.env.NEXT_PUBLIC_LIFF_ID || "";

// LINE Developers 已設定的正式網站網址
const PRODUCTION_URL =
  "https://v0-supabase-form-integration-two.vercel.app/";

const PRODUCTION_ORIGIN =
  new URL(PRODUCTION_URL).origin;

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: any | null;
  userName: string | null;
  isLiffInit: boolean;
  isLoading: boolean;
  login: () => void;
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

const LiffContext =
  createContext<LiffContextType>({
    isAuthenticated: false,
    userEmail: null,
    lineUserId: null,
    userProfile: null,
    userName: null,
    isLiffInit: false,
    isLoading: true,
    login: () => {},
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

  // 從學校信箱取得學號
  const extractNameFromEmail = (
    email: string | null
  ) => {
    if (!email) return null;

    return email
      .split("@")[0]
      .toUpperCase();
  };

  // 判斷目前是否在正式網站
  const isProductionWebsite = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.location.origin ===
      PRODUCTION_ORIGIN
    );
  };

  // LINE 登入
  const login = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    // 防止 Preview 網址造成 LINE 400
    // 只在使用者點擊登入時進行轉址
    if (!isProductionWebsite()) {
      console.log(
        "目前不是正式網站，正在轉往正式網址..."
      );

      window.location.replace(
        PRODUCTION_URL
      );

      return;
    }

    // 確認 LIFF 已初始化
    if (!liffInstance) {
      console.warn(
        "LIFF 尚未初始化，無法執行登入"
      );

      return;
    }

    // 已登入 LINE 就不需要重複登入
    if (liffInstance.isLoggedIn()) {
      console.log(
        "LINE 已登入，無須重複驗證"
      );

      return;
    }

    try {
      // 在 LINE App 內使用原本的 LIFF 流程
      if (liffInstance.isInClient()) {
        console.log(
          "正在使用 LINE App 內建登入"
        );

        liffInstance.login();

        return;
      }

      // 在電腦 Chrome、Edge 等外部瀏覽器
      // 固定使用 LINE Developers 設定的正式網址
      console.log(
        "正在使用電腦版 LINE 登入"
      );

      liffInstance.login({
        redirectUri: PRODUCTION_URL,
      });
    } catch (err) {
      console.error(
        "LINE 登入啟動失敗:",
        err
      );
    }
  }, [liffInstance]);

  useEffect(() => {
    let isMounted = true;

    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    async function initAuthAndLiff() {
      try {
        // 1. 讀取 Supabase 登入狀態
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (session && isMounted) {
          const email =
            session.user.email ?? null;

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

        // 2. 監聽 Supabase 登入狀態
        const authListener =
          supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (!isMounted) {
                return;
              }

              if (session) {
                const email =
                  session.user.email ??
                  null;

                setUserEmail(email);

                setUserName(
                  extractNameFromEmail(
                    email
                  )
                );

                setIsAuthenticated(
                  email
                    ?.toLowerCase()
                    .endsWith(
                      "@stust.edu.tw"
                    ) ?? false
                );
              } else {
                setUserEmail(null);
                setUserName(null);
                setIsAuthenticated(false);
              }
            }
          );

        subscription =
          authListener.data.subscription;

        // 3. 初始化 LINE LIFF
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

          // 4. 讀取已登入的 LINE 資料
          // 不主動呼叫 login，避免無限跳轉
          if (liff.isLoggedIn()) {
            const profile =
              await liff.getProfile();

            if (isMounted) {
              setLineUserId(
                profile.userId
              );

              setUserProfile(
                profile
              );
            }
          } else {
            console.log(
              "LINE LIFF 初始化完成，目前尚未登入。"
            );
          }
        } else {
          console.warn(
            "未設定 NEXT_PUBLIC_LIFF_ID"
          );
        }
      } catch (err) {
        console.error(
          "LINE 或 Supabase 初始化失敗:",
          err
        );
      } finally {
        if (isMounted) {
          setIsLiffInit(true);
          setIsLoading(false);
        }
      }
    }

    initAuthAndLiff();

    return () => {
      isMounted = false;

      subscription?.unsubscribe();
    };
  }, []);

  // 發送南臺學校信箱驗證碼
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
      console.error(
        "學校信箱驗證碼發送失敗:",
        err
      );

      return {
        success: false,
        error:
          err?.message ||
          "驗證碼發送失敗",
      };
    }
  };

  // 驗證南臺學校信箱 OTP
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

        setUserEmail(
          verifiedEmail
        );

        setUserName(
          extractNameFromEmail(
            verifiedEmail
          )
        );

        setIsAuthenticated(
          verifiedEmail
            ?.toLowerCase()
            .endsWith(
              "@stust.edu.tw"
            ) ?? false
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
      console.error(
        "學校信箱驗證失敗:",
        err
      );

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
        sendOtp,
        verifyOtp,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />

          <p className="text-slate-500 font-bold tracking-wider text-sm">
            正在安全同步南臺市集資料...
          </p>
        </div>
      ) : (
        children
      )}
    </LiffContext.Provider>
  );
}
