"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase"; // 引入你設定好的 supabase
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  login: () => {},
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
        // 1. 優先檢查 Supabase 的快取 Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 如果 Supabase 有快取，直接放行！
          setUserEmail(session.user.email ?? null);
          setIsAuthenticated(true);
          // 嘗試背景初始化 LIFF (不強制跳轉)
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
          }
        } else {
          // 2. 如果沒有 Supabase Session，才去跑 LIFF
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
            // 這裡可以導向你的登入頁面
          }
        }
      } catch (e) {
        console.error("Auth Init Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
      <p className="text-slate-500 font-medium italic">校園市集檢查權限中...</p>
    </div>
  );

  // 如果沒登入，我們不要在這個 Provider 裡寫死 VerificationForm
  // 而是讓外部的 Page 決定要去哪裡登入
  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      login: () => liff.login() 
    }}>
      {children}
    </LiffContext.Provider>
  );
}
