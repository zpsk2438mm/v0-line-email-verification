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
// 1. 配置與常數
// ==========================================
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const AUTH_STORAGE_KEY = "stust_authenticated";
const VERIFICATION_CODE = "123456";

// ==========================================
// 2. 類型定義
// ==========================================
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
  sendLineMessage: (productName: string, price: number, imageUrl?: string) => Promise<boolean>;
  closeWindow: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null,
  sendLineMessage: async () => false,
  closeWindow: () => {},
});

export const useLiff = () => useContext(LiffContext);

// ==========================================
// 3. 核心 Provider 組件
// ==========================================
export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化邏輯
  useEffect(() => {
    async function init() {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (isLocal) {
        setLineUserId("dev_user_localhost");
        setUserEmail("4b290005@stust.edu.tw");
        setUserProfile({
          displayName: "開發者帳號",
          pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=STUST",
        });
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const token = liff.getDecodedIDToken();
        const email = token?.email || null;

        setUserProfile(profile);
        setLineUserId(profile.userId);
        setUserEmail(email);

        if (email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (err) {
        console.error("LIFF 錯誤:", err);
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const sendLineMessage = async () => true; // 簡化處理
  const closeWindow = () => liff.closeWindow();

  if (isLoading && !needsVerification) return <LoadingScreen />;
  
  if (needsVerification && !isAuthenticated) {
    return (
      <VerificationForm 
        onVerified={(email) => {
          setUserEmail(email);
          setIsAuthenticated(true);
          setNeedsVerification(false);
          setIsReady(true);
        }} 
      />
    );
  }

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId, userProfile, sendLineMessage, closeWindow }}>
      {children}
    </LiffContext.Provider>
  );
}

// ==========================================
// 4. 驗證表單組件 (修正引用錯誤)
// ==========================================
function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const handleVerify = () => {
    if (otpValue === VERIFICATION_CODE) {
      onVerified(schoolEmail);
    } else {
      alert("驗證碼錯誤");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <GraduationCap className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-bold mb-6">驗證南台學校信箱</h1>
        <div className="space-y-4">
          <Input 
            placeholder="your_id@stust.edu.tw" 
            value={schoolEmail} 
            onChange={(e) => setSchoolEmail(e.target.value)}
          />
          <Button className="w-full" onClick={() => setShowOtpDialog(true)}>發送驗證碼</Button>
        </div>
      </div>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>輸入驗證碼</DialogTitle>
            <DialogDescription>請輸入發送到 {schoolEmail} 的 6 位數密碼</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <Button className="w-full" onClick={handleVerify}>確認驗證</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 5. 載入中組件
// ==========================================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
