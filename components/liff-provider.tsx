"use client";

// components/liff-provider.tsx 終極完美修正版

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: any | null; 
  userName: string | null;
  isLiffInit: boolean; 
  isLoading: boolean; // 🎯 修正：將 Loading 狀態也暴露出去，讓各頁面自己優雅決定怎麼擋
  login: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
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
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null); 
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiffInit, setIsLiffInit] = useState(false); 
  const [liffInstance, setLiffInstance] = useState<any>(null);

  const extractNameFromEmail = (email: string | null) => {
    if (!email) return null;
    return email.split("@")[0].toUpperCase();
  };

  // 🎯 關鍵修正：登入重新導向必須完全乾淨，不帶次級路由，防止 LINE 噴 400
  const login = useCallback(() => {
    if (!liffInstance) {
      console.warn("LIFF 還沒準備好，無法執行登入");
      return;
    }
    if (typeof window !== "undefined") {
      liffInstance.login({ redirectUri: window.location.origin });
    } else {
      liffInstance.login();
    }
  }, [liffInstance]);

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

        // 3. 動態初始化 LIFF 身分
        if (LIFF_ID && typeof window !== "undefined") {
          const { default: liff } = await import("@line/liff");
          
          await liff.init({ liffId: LIFF_ID });
          
          if (isMounted) {
            setLiffInstance(liff);
          }

          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (isMounted) {
              setLineUserId(profile.userId);
              setUserProfile(profile);
            }
          } else if (liff.isInClient()) {
            liff.login();
          }
        }
      } catch (e) {
        console.error("安全認證或 LIFF 初始化失敗:", e);
      } finally {
        if (isMounted) {
          // 🎯 核心修正：確保狀態同步，將初始化完成與 Loading 解鎖在同一步驟執行！
          setIsLiffInit(true); 
          setIsLoading(false);
        }
      }
    }

    initAuthAndLiff();

    return () => {
      isMounted = false;
    };
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

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

  // 🎯 核心修正：全域的 Provider 必須永遠存在，絕不能用 if (isLoading) 把它卸載，否則狀態時間差會殺死子組件
  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      userProfile, 
      userName,
      isLiffInit, 
      isLoading, // 暴露出去
      login,
      sendOtp,
      verifyOtp
    }}>
      {/* 這裡做一個局部過渡：只有當最最一開始加載時顯示骨架，但 Provider 已經存活 */}
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
          <p className="text-slate-500 font-bold tracking-wider text-sm">正在安全同步南臺市集資料...</p>
        </div>
      ) : (
        children
      )}
    </LiffContext.Provider>
  );
}
