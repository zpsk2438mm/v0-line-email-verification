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
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const AUTH_STORAGE_KEY = "stust_authenticated";
const VERIFICATION_CODE = "123456";

// ==========================================
// Types
// ==========================================
interface UserProfile {
  displayName: string;
  pictureUrl?: string;
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
// Provider Component
// ==========================================
export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleManualVerification = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    setNeedsVerification(false);
    setIsReady(true);
  };

  useEffect(() => {
    async function initializeLiff() {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (isLocal) {
        setLineUserId("dev_user_localhost");
        setUserEmail("4b290005@stust.edu.tw");
        setUserProfile({
          displayName: "南台測試員",
          pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=STUST",
        });
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        await liff.ready;

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email || null;

        setUserProfile(profile);
        setLineUserId(profile.userId);
        setUserEmail(email);

        if (email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }

    initializeLiff();
  }, []);

  const sendLineMessage = async () => true; 
  const closeWindow = () => { if (liff.isInClient()) liff.closeWindow(); };

  if (isLoading && !needsVerification) return <LoadingScreen />;
  if (needsVerification && !isAuthenticated) return <VerificationForm onVerified={handleManualVerification} />;
  if (!isReady || !isAuthenticated) return <LoadingScreen />;

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId, userProfile, sendLineMessage, closeWindow }}>
      {children}
    </LiffContext.Provider>
  );
}

// ==========================================
// 恢復原始 UI 的登入頁面
// ==========================================
function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (otpValue === VERIFICATION_CODE) {
        onVerified(schoolEmail);
      } else {
        alert("驗證碼錯誤");
      }
      setIsVerifying(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">南台二手物平台</h1>
          <p className="text-sm text-muted-foreground">請驗證您的學校信箱以繼續</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">學校信箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your_id@stust.edu.tw"
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={() => setShowOtpDialog(true)} disabled={!schoolEmail} className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" />
              發送驗證碼
            </Button>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">僅限南台科技大學師生使用</p>
          </div>
        </div>
      </div>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>輸入驗證碼</DialogTitle>
            <DialogDescription>驗證碼已發送至 <span className="font-medium text-foreground">{schoolEmail}</span></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <Button onClick={handleVerifyOtp} disabled={otpValue.length !== 6 || isVerifying} className="w-full">
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "確認驗證"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-center">
      <div className="space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">驗證身分中...</p>
      </div>
    </div>
  );
}
