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
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: true, // 測試模式：預設為 true
  userEmail: null,
  lineUserId: null,
  login: () => {},
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  // 🟢 暴力開門：預設直接通過驗證
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  
  // 🟢 模擬資料：這樣你的 ListingForm 才能抓到東西跑出來
  const [userEmail, setUserEmail] = useState<string | null>("test-user@stust.edu.tw");
  const [lineUserId, setLineUserId] = useState<string | null>("test_line_user_id_999");
  
  // 🟢 直接關閉載入狀態
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 測試模式下，我們暫時不執行複雜的檢查邏輯
    async function init() {
      try {
        console.log("🛠️ 目前處於測試後門模式：已跳過所有驗證");
        
        // 雖然跳過驗證，但還是背景初始化一下 LIFF 避免其他地方噴錯
        if (LIFF_ID) {
          await liff.init({ liffId: LIFF_ID });
        }
      } catch (e) {
        console.warn("LIFF 背景初始化失敗，但不影響測試。");
      }
    }
    init();
  }, []);

  // 測試模式直接回傳內容，不顯示任何載入畫面
  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      login: () => console.log("測試模式：不需執行登入") 
    }}>
      {children}
    </LiffContext.Provider>
  );
}
