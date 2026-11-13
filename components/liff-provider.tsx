
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

const LIFF_ID =
  process.env.NEXT_PUBLIC_LIFF_ID || "";

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

  const extractNameFromEmail = (
    email: string | null
  ) => {
    if (!email) return null;
    return email
      .split("@")[0]
      .toUpperCase();
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
      if (liffInstance.isInClient()) {
        // LINE App 內使用 LIFF 預設登入
        liffInstance.login();
      } else {
        // 外部瀏覽器固定返回網站首頁
        // 避免目前網址帶有不必要的參數
        const redirectUri =
          `${window.location.origin}/`;

        liffInstance.login({
          redirectUri,
        });
      }
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
        // 1. 初始化 Supabase 登入狀態
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

        // 2. 監聽 Supabase 驗證狀態
        const authListener =
          supabase.auth.onAuthStateChange(
            (_event, session) => {
              if (!isMounted) return;

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

          // 4. 只讀取已登入的 LINE 身分
          // 不在初始化時強制登入
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
              "LINE LIFF 初始化成功，等待使用者手動登入。"
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

    initAuthAndLiff();

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
