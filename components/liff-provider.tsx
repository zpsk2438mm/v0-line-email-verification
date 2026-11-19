
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

// 暫時診斷用，不記錄個人資料
const DIAG_KEY = "stust_liff_diagnostic_v1";

type DiagnosticData = {
  count: number;
  stage: string;
  history: string[];
};

function readDiagnostic(): DiagnosticData {
  const fallback: DiagnosticData = {
    count: 0,
    stage: "尚未開始",
    history: [],
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = sessionStorage.getItem(DIAG_KEY);

    if (!saved) return fallback;

    const parsed = JSON.parse(saved);

    return {
      count:
        typeof parsed.count === "number"
          ? parsed.count
          : 0,
      stage:
        typeof parsed.stage === "string"
          ? parsed.stage
          : fallback.stage,
      history: Array.isArray(parsed.history)
        ? parsed.history.slice(-12)
        : [],
    };
  } catch {
    return fallback;
  }
}

function saveDiagnostic(
  stage: string,
  newLoad = false
): DiagnosticData {
  const current = readDiagnostic();

  const next: DiagnosticData = {
    count: current.count + (newLoad ? 1 : 0),
    stage,
    history: [
      ...current.history,
      `${newLoad ? "新載入" : "階段"}：${stage}`,
    ].slice(-12),
  };

  try {
    sessionStorage.setItem(
      DIAG_KEY,
      JSON.stringify(next)
    );
  } catch {
    // 儲存空間不可用時不影響正式功能
  }

  console.info("[LIFF 診斷]", stage);

  return next;
}

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

  // 診斷面板
  const [showDiagnostic, setShowDiagnostic] =
    useState(false);

  const [diagnostic, setDiagnostic] =
    useState<DiagnosticData>({
      count: 0,
      stage: "尚未開始",
      history: [],
    });

  const updateDiagnostic = useCallback(
    (stage: string, newLoad = false) => {
      const next = saveDiagnostic(
        stage,
        newLoad
      );

      setDiagnostic(next);
    },
    []
  );

  const extractNameFromEmail = (
    email: string | null
  ) => {
    if (!email) return null;

    return email.split("@")[0].toUpperCase();
  };

  // LINE 登入：保留原本流程
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

  // 登出：保留原本流程
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

    localStorage.removeItem(
      "stust_authenticated"
    );

    localStorage.removeItem(
      "line_user_id"
    );

    sessionStorage.removeItem(
      LOGIN_NEXT_KEY
    );

    setIsAuthenticated(false);
    setUserEmail(null);
    setLineUserId(null);
    setUserProfile(null);
    setUserName(null);

    window.location.replace("/");
  }, [liffInstance]);

  // 初始化 Supabase 與 LINE，加入診斷紀錄
  useEffect(() => {
    let isMounted = true;

    let subscription:
      | {
          unsubscribe: () => void;
        }
      | undefined;

    const isProductPage =
      /^\/products\/[^/]+\/?$/.test(
        window.location.pathname
      );

    if (isProductPage) {
      setShowDiagnostic(true);
      updateDiagnostic(
        "Provider 開始初始化",
        true
      );
    }

    const mark = (stage: string) => {
      if (isProductPage && isMounted) {
        updateDiagnostic(stage);
      }
    };

    async function initAuthAndLiff() {
      try {
        mark("開始取得 Supabase Session");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        mark("Supabase Session 取得完成");

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

        mark("Supabase 監聽器設定完成");

        if (
          LIFF_ID &&
          typeof window !== "undefined"
        ) {
          mark("開始載入 LIFF SDK");

          const { default: liff } =
            await import("@line/liff");

          mark("LIFF SDK 載入完成");

          mark("即將執行 liff.init");

          await liff.init({
            liffId: LIFF_ID,
          });

          mark("liff.init 執行完成");

          if (isMounted) {
            setLiffInstance(liff);
          }

          if (liff.isLoggedIn()) {
            mark("LINE 已登入，開始取得 Profile");

            const profile =
              await liff.getProfile();

            mark("LINE Profile 取得完成");

            if (isMounted) {
              setLineUserId(
                profile.userId
              );

              setUserProfile(profile);
            }
          } else {
            mark("LINE 尚未登入");

            console.log(
              "LINE LIFF 初始化成功，等待手動登入。"
            );
          }
        } else {
          mark("LIFF ID 未設定");

          console.warn(
            "尚未設定 NEXT_PUBLIC_LIFF_ID"
          );
        }
      } catch (err) {
        console.error(
          "LINE / Supabase 初始化失敗:",
          err
        );

        mark(
          "初始化發生錯誤：" +
            (err instanceof Error
              ? err.name
              : "未知錯誤")
        );
      } finally {
        if (isMounted) {
          mark("初始化結束，準備顯示頁面");

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
  }, [updateDiagnostic]);

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

  // 只在商品詳細頁顯示診斷面板
  const diagnosticPanel = showDiagnostic ? (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 2147483647,
        maxHeight: "42vh",
        overflowY: "auto",
        padding: 12,
        borderRadius: 12,
        background: "rgba(15,23,42,0.94)",
        color: "#ffffff",
        fontSize: 12,
        lineHeight: 1.6,
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontWeight: "bold" }}>
        LINE 商品頁診斷
      </div>

      <div>
        Provider 初始化次數：
        {diagnostic.count}
      </div>

      <div>
        目前階段：{diagnostic.stage}
      </div>

      <div
        style={{
          marginTop: 6,
          borderTop: "1px solid #64748b",
          paddingTop: 6,
        }}
      >
        {diagnostic.history.map(
          (item, index) => (
            <div key={index}>
              {item}
            </div>
          )
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem(
              DIAG_KEY
            );
          } catch {
            // 忽略儲存空間錯誤
          }

          setDiagnostic({
            count: 0,
            stage: "已清除紀錄",
            history: [],
          });
        }}
        style={{
          marginTop: 8,
          padding: "4px 10px",
          background: "#475569",
          borderRadius: 6,
        }}
      >
        清除紀錄
      </button>
    </div>
  ) : null;

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

      {diagnosticPanel}
    </LiffContext.Provider>
  );
}
