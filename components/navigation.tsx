"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import liff from "@line/liff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, ShieldCheck, Loader2, GraduationCap } from "lucide-react";

// ==========================================
// Configuration
// ==========================================
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const DEV_EMAIL = "YOUR_GMAIL@gmail.com"; 
const AUTH_STORAGE_KEY = "stust_authenticated";
const AUTH_EXPIRY_DAYS = 7;
const VERIFICATION_CODE = "123456";

// ==========================================
// Types
// ==========================================
interface UserProfile {
  displayName: string;
  pictureUrl: string;
  email: string | null;
}

interface LiffContextType {
  isReady: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: UserProfile | null;
  login: () => void;
  sendLineMessage: (productName: string, price: number, imageUrl?: string) => Promise<boolean>;
  closeWindow: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isLoading: true,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null,
  login: () => {},
  sendLineMessage: async () => false,
  closeWindow: () => {},
});

export const useLiff = () => useContext(LiffContext);

// --- 省略 Helper Functions (保持原樣即可) ---
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}
function getStoredAuth() { /* 原本的邏輯 */ }
function setStoredAuth(email?: string, lineUserId?: string) { /* 原本的邏輯 */ }
function clearStoredAuth() { /* 原本的邏輯 */ }
function isAuthValid() { /* 原本的邏輯 */ }
function isEmailAllowed(email: string | null | undefined) {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return lowerEmail.endsWith(ALLOWED_DOMAIN) || lowerEmail === DEV_EMAIL.toLowerCase();
}

// --- 省略 VerificationForm & LoadingScreen (保持原樣即可) ---

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initRetryCount, setInitRetryCount] = useState(0);

  const login = () => {
    if (!liff.isLoggedIn()) liff.login();
  };

  const handleManualVerification = (email: string) => {
    setStoredAuth(email, lineUserId || undefined);
    setUserEmail(email);
    // 確保手動驗證後，profile 的 email 也同步更新
    setUserProfile((prev) => ({
      displayName: prev?.displayName || "南台同學",
      pictureUrl: prev?.pictureUrl || "",
      email: email
    }));
    setIsAuthenticated(true);
    setNeedsVerification(false);
    setIsReady(true);
  };

  // --- 省略 sendLineMessage & closeWindow (保持原樣即可) ---

  useEffect(() => {
    async function initializeLiff() {
      // 1. 本地開發模擬
      if (isLocalhost()) {
        const mockData = {
          displayName: "椅子 🪑",
          email: "dev@stust.edu.tw",
          pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
        };
        setLineUserId("Uf7c4668bc96315297b02b0a67fff88ea");
        setUserEmail(mockData.email);
        setUserProfile(mockData);
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // 2. 檢查快取
      const authCheck = isAuthValid() as any;
      if (authCheck.valid && authCheck.data) {
        setUserEmail(authCheck.data.email || null);
        setLineUserId(authCheck.data.lineUserId || null);
        setUserProfile({ 
          email: authCheck.data.email, 
          displayName: "已驗證用戶", 
          pictureUrl: "" 
        });
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // 3. 正式 LIFF 初始化
      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          setIsLoading(false);
          return; // 這裡不強制登入，讓頁面按鈕觸發
        }

        const profile = await liff.getProfile();
        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email || null;

        const currentProfile = {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl || "",
          email: email,
        };

        setUserProfile(currentProfile);
        setUserEmail(email);
        setLineUserId(profile.userId);

        if (isEmailAllowed(email)) {
          setStoredAuth(email || undefined, profile.userId || undefined);
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
        if (initRetryCount < 2) {
          setInitRetryCount(prev => prev + 1);
        } else {
          setNeedsVerification(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initializeLiff();
  }, [initRetryCount]);

  // 全域 Context 值
  const value = {
    isReady,
    isLoading,
    isAuthenticated,
    userEmail,
    lineUserId,
    userProfile,
    login,
    sendLineMessage: async () => true, // 簡化版
    closeWindow: () => liff.closeWindow(),
  };

  if (isLoading && !needsVerification) return <LoadingScreen />;
  if (needsVerification && !isAuthenticated) return <VerificationForm onVerified={handleManualVerification} />;

  return (
    <LiffContext.Provider value={value}>
      {children}
    </LiffContext.Provider>
  );
}
