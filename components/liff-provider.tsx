"use client";

// components/liff-provider.tsx 終極修復版

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: any | null; // 👈 確保它是全域解構的
  userName: string | null;
  isLiffInit: boolean; // 👈 關鍵：暴露這個狀態給其他頁面用
  login: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null, // 👈 新增
  userName: null,
  isLiffInit: false, // 👈 新增
  login: () => {},
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null); // 👈 內部緩存狀態
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiffInit, setIsLiffInit] = useState(false); // 👈 LINE 初始化鎖定

  // 輔助函式：提取學號 (4b290005@stust.edu.tw -> 4b290005)
  const extractNameFromEmail = (email: string | null) => {
    if (!email) return null;
    return email.split("@")[0].toUpperCase();
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuthAndLiff() {
      try {
        // 1. 先確認 Supabase 狀態
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          const email = session.user.email ?? null;
          setUserEmail(email);
          setUserName(extractNameFromEmail(email));
          setIsAuthenticated(true);
        }

        // 2. 實時監聽 Supabase 變更
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted) {
            if (session) {
              const email = session.user.email ?? null;
              setUserEmail(email);
              setUserName(extractNameFromEmail(email));
              setIsAuthenticated(true);
            } else {
              setUserEmail(null);
              setUserName(null);
              setIsAuthenticated(false);
            }
          }
        });

        // 3. ✨ 終極修復點：初始化 LIFF 身分
        if (LIFF_ID) {
          await liff.init({ liffId: LIFF_ID });
          
          if (isMounted) setIsLiffInit(true); // 鎖定：LINE 初始化完成

          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (isMounted) {
              setLineUserId(profile.userId);
              setUserProfile(profile); // 👈 核心：同步把 LINE 資料緩存到 Provider，全域可用
            }
          } else if (liff.isInClient()) {
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

  //  OTP 發送 (乾淨版本，走 SignIn)
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

  //  驗證碼核對 (標準版本，不撈 nonexistent tables)
  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      
      if (data.session) {
        const email = data.session.user.email ?? null;
        setUserEmail(email);
        setUserName(extractNameFromEmail(email));
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
      userProfile, // 👈 現在它是全域緩存了
      userName,
      isLiffInit, // 👈 關鍵：提供此鎖定
      login: () => liff.login(),
      sendOtp,
      verifyOtp
    }}>
      {children}
    </LiffContext.Provider>
  );
}
