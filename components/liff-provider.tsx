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
import { Mail, ShieldCheck, Loader2, GraduationCap, CheckCircle2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const VERIFICATION_CODE = "123456";
const EMAIL_VERIFIED_KEY = "stust_email_verified_status"; // ✨ 快取 Key

interface UserProfile {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  userProfile: UserProfile | null;
  login: () => void;
  sendLineMessage: (productName: string, price: number) => Promise<boolean>;
  closeWindow: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null,
  login: () => {},
  sendLineMessage: async () => false,
  closeWindow: () => {},
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const cachedEmail = localStorage.getItem(EMAIL_VERIFIED_KEY); // ✨ 讀取快取

      if (isLocal) {
        setUserProfile({ displayName: "南台測試員", pictureUrl: "" });
        setUserEmail("4b290005@stust.edu.tw");
        setLineUserId("dev_id_123");
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          setIsLoading(false);
          return;
        }

        const [profile, token] = await Promise.all([
          liff.getProfile(),
          liff.getDecodedIDToken()
        ]);

        const email = token?.email || null;
        setUserProfile(profile);
        setLineUserId(profile.userId);

        // ✨ 關鍵邏輯：如果有 LINE Email 或 本地快取，就直接算驗證通過
        if (email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          setUserEmail(email);
          setIsAuthenticated(true);
          setIsReady(true);
        } else if (cachedEmail && cachedEmail.endsWith(ALLOWED_DOMAIN)) {
          setUserEmail(cachedEmail);
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (err) {
        console.error("LIFF 初始化失敗:", err);
        if (cachedEmail) {
          setUserEmail(cachedEmail);
          setIsAuthenticated(true);
        } else {
          setNeedsVerification(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  const handleVerified = (email: string) => {
    localStorage.setItem(EMAIL_VERIFIED_KEY, email); // ✨ 存入快取
    setUserEmail(email);
    setIsAuthenticated(true);
    setIsReady(true);
    setNeedsVerification(false);
  };

  const login = () => liff.login();

  if (isLoading && !needsVerification) {
    return <LoadingScreen />;
  }
  
  if (needsVerification && !isAuthenticated) {
    return <VerificationForm onVerified={handleVerified} />;
  }

  return (
    <LiffContext.Provider value={{ 
      isReady, 
      isAuthenticated, 
      userEmail, 
      lineUserId, 
      userProfile, 
      login,
      sendLineMessage: async () => true, 
      closeWindow: () => liff.closeWindow() 
    }}>
      {children}
    </LiffContext.Provider>
  );
}

// VerificationForm 及 LoadingScreen 保持原本代碼...
// (此處省略部分重複 UI 程式碼以節省長度，請保留你原本檔案下方的 VerificationForm 元件)
