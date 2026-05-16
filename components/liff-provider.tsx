"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  login: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  login: () => {},
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserEmail(session.user.email ?? null);
          setIsAuthenticated(true);
        }

        if (LIFF_ID) {
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
          } else {
            // 如果是在 LINE 環境內但沒登入，可以選擇自動呼叫 liff.login()
            console.log("LINE 未登入狀態");
          }
        }
      } catch (e) {
        console.error("初始化失敗:", e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // 丟給驗證碼畫面呼叫的：發送 OTP
  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // 告訴 Supabase 驗證完留在原地，絕對不要跳去 /login
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 丟給驗證碼畫面呼叫的：驗證 6 位數
  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      
      if (data.session) {
        setUserEmail(data.session.user.email ?? null);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: "驗證成功但未能建立工作階段" };
    } catch (err: any) {
      return { success: false, error: err.message || "驗證碼錯誤，請重新輸入" };
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F6]">
      <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
      <p className="text-gray-500 font-bold tracking-wider">南臺市集認證安全檢查中...</p>
    </div>
  );

  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      login: () => liff.login(),
      sendOtp,
      verifyOtp
    }}>
      {children}
    </LiffContext.Provider>
  );
}
