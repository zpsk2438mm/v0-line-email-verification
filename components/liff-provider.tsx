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
  verifyOtp: (email: string, token: string) => Promise<void>; // 新增驗證函數
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  login: () => {},
  verifyOtp: async () => {},
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
        // 1. 優先檢查是否有存好的 Supabase Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setUserEmail(session.user.email ?? null);
          setIsAuthenticated(true);
        }

        // 2. 初始化 LINE LIFF (抓取 LINE ID 用)
        if (LIFF_ID) {
          await liff.init({ liffId: LIFF_ID });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            setLineUserId(profile.userId);
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

  // 提供給 VerificationForm 使用的真實驗證函數
  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    
    if (data.session) {
      setUserEmail(data.session.user.email ?? null);
      setIsAuthenticated(true);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
      <p className="text-slate-500 font-medium italic">安全檢查中...</p>
    </div>
  );

  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      login: () => liff.login(),
      verifyOtp
    }}>
      {children}
    </LiffContext.Provider>
  );
}
