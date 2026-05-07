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

// ==========================================
// Configuration
// ==========================================
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const VERIFICATION_CODE = "123456";

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  sendLineMessage: (productName: string, price: number, imageUrl?: string) => Promise<boolean>;
  closeWindow: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  sendLineMessage: async () => false,
  closeWindow: () => {},
});

export const useLiff = () => useContext(LiffContext);

// ==========================================
// Verification Form Component (修正重點)
// ==========================================
function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showTipDialog, setShowTipDialog] = useState(false); // 控制「驗證碼提示」
  const [showOtpDialog, setShowOtpDialog] = useState(false); // 控制「輸入驗證碼」
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendCode = () => {
    if (!schoolEmail.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setError("請使用南台學校信箱 (@stust.edu.tw)");
      return;
    }
    setError("");
    setShowTipDialog(true); // 先顯示提示視窗
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (otpValue === VERIFICATION_CODE) {
        onVerified(schoolEmail);
      } else {
        setError("驗證碼錯誤，請輸入 123456");
        setOtpValue("");
      }
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg shadow-blue-100">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">南台二手物平台</h1>
          <p className="text-sm text-slate-500">請驗證您的學校信箱以繼續</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">學校信箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="your_id@stust.edu.tw"
                  value={schoolEmail}
                  onChange={(e) => { setSchoolEmail(e.target.value); setError(""); }}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
              {error && !showOtpDialog && !showTipDialog && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>
            <Button onClick={handleSendCode} disabled={!schoolEmail} className="w-full h-11 rounded-xl font-bold">
              <ShieldCheck className="w-4 h-4 mr-2" />
              發送驗證碼
            </Button>
          </div>
        </div>
      </div>

      {/* 第一階段：驗證碼提示 Dialog */}
      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8">
          <DialogHeader className="items-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl">驗證碼已發送</DialogTitle>
            <DialogDescription className="text-center pt-2">
              系統已模擬發送郵件至：<br/>
              <span className="font-bold text-slate-900">{schoolEmail}</span>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">測試環境驗證碼</p>
                <p className="text-3xl font-black text-primary tracking-[0.5em] ml-[0.5em]">{VERIFICATION_CODE}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={() => { setShowTipDialog(false); setShowOtpDialog(true); }} 
            className="w-full h-12 rounded-xl mt-4 font-bold"
          >
            我記住了，前往驗證
          </Button>
        </DialogContent>
      </Dialog>

      {/* 第二階段：OTP 輸入 Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-8">
          <DialogHeader className="items-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">輸入驗證碼</DialogTitle>
            <DialogDescription className="text-center">請輸入 6 位數驗證碼</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="rounded-xl border-slate-200 w-11 h-14 text-xl font-bold" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
            <Button 
              onClick={handleVerifyOtp} 
              disabled={otpValue.length !== 6 || isVerifying} 
              className="w-full h-12 rounded-xl font-bold"
            >
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認驗證"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// Provider Component
// ==========================================
export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal) {
        setUserEmail("dev@stust.edu.tw");
        setLineUserId("dev_id");
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

        setLineUserId(profile.userId);
        setUserEmail(email);

        if (email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (err) {
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  if (isLoading && !needsVerification) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (needsVerification && !isAuthenticated) return <VerificationForm onVerified={(email) => { setUserEmail(email); setIsAuthenticated(true); setIsReady(true); }} />;
  if (!isReady || !isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId, sendLineMessage: async () => true, closeWindow: () => liff.closeWindow() }}>
      {children}
    </LiffContext.Provider>
  );
}
