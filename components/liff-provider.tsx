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
    let isMounted = true;

    async function initAuthAndLiff() {
      try {
        // 1. 先確認 Supabase 本地快取的工作階段（自動登入關鍵）
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setUserEmail(session.user.email ?? null);
          setIsAuthenticated(true);
        }

        // 2. 實時監聽 Supabase 登入狀態變更
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted) {
            if (session) {
              setUserEmail(session.user.email ?? null);
              setIsAuthenticated(true);
            } else {
              setUserEmail(null);
              setIsAuthenticated(false);
            }
          }
        });

        // 3. 初始化 LINE LIFF 身分
        if (LIFF_ID) {
          await liff.init({ liffId: LIFF_ID });
          
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (isMounted) setLineUserId(profile.userId);
          } else if (liff.isInClient()) {
            // 在 LINE 軟體內如果掉登入，原地引導自動補登 LINE，不干擾 Email 狀態
            liff.login();
          }
        }
      } catch (e) {
        console.error("安全認證或 LIFF 初始化失敗:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuthAndLiff();

    return () => {
      isMounted = false;
    };
  }, []);

  // 🎯 定案：回歸最純粹的 OTP 發送。不帶 options，直接由後台範本接手
  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 🎯 定案：標準的 6 位數 email 驗證
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
      return { success: false, error: "驗證成功但未能建立安全工作階段" };
    } catch (err: any) {
      return { success: false, error: err.message || "驗證碼錯誤，請重新輸入" };
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F6]">
      <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
      <p className="text-gray-500 font-bold tracking-wider">南臺市集安全檢查中...</p>
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
