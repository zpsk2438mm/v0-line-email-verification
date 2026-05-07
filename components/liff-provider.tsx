"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import liff from "@line/liff"; // 確保你有執行 npm install @line/liff
import { Loader2 } from "lucide-react";

// ==========================================
// Configuration
// ==========================================
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const AUTH_STORAGE_KEY = "stust_authenticated";

// ==========================================
// Types
// ==========================================
export interface UserProfile {
  displayName: string;
  pictureUrl: string;
  email: string | null;
}

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: UserProfile | null;
  closeWindow: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null,
  closeWindow: () => {},
});

export const useLiff = () => useContext(LiffContext);

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeLiff() {
      try {
        // 本地開發模擬模式
        if (isLocalhost()) {
          const mockProfile = { 
            displayName: "椅子 🪑", 
            email: "dev@stust.edu.tw", 
            pictureUrl: "" 
          };
          setUserProfile(mockProfile);
          setUserEmail(mockProfile.email);
          setLineUserId("dev-user-id");
          setIsAuthenticated(true);
          setIsReady(true);
          return;
        }

        // 初始化 LIFF
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // 抓取真實資料
        const profile = await liff.getProfile();
        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email || null;

        const data: UserProfile = {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl || "",
          email: email,
        };

        setUserProfile(data);
        setLineUserId(profile.userId);
        setUserEmail(email);

        // 簡單驗證邏輯
        if (email?.endsWith(ALLOWED_DOMAIN)) {
          setIsAuthenticated(true);
          setIsReady(true);
        }
      } catch (err) {
        console.error("LIFF 載入失敗:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initializeLiff();
  }, []);

  const value = {
    isReady,
    isAuthenticated,
    userEmail,
    lineUserId,
    userProfile,
    closeWindow: () => liff.closeWindow(),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">驗證身分中...</p>
      </div>
    );
  }

  return (
    <LiffContext.Provider value={value}>
      {children}
    </LiffContext.Provider>
  );
}
