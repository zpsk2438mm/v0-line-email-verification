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
// Types & Config
// ==========================================
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const VERIFICATION_CODE = "123456";

interface UserProfile {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;      // 👈 確保導出驗證後的信箱
  lineUserId: string | null;
  userProfile: UserProfile | null; 
  login: () => void;             // 👈 導出登入方法
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

  useEffect(() => {
    async function initialize() {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      
      // 開發環境模擬資料
      if (isLocal) {
        setUserProfile({ 
          displayName: "南台測試員", 
          pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=STUST" 
        });
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
          // 不在初始化時自動強制 login，交給頁面上的按鈕觸發更好
          setIsLoading(false);
          return;
        }

        // 獲取 LINE 個人資料與 Token 資訊
        const [profile, token] = await Promise.all([
          liff.getProfile(),
          liff.getDecodedIDToken()
        ]);

        const email = token?.email || null;

        setUserProfile(profile);
        setLineUserId(profile.userId);
        setUserEmail(email);

        // 自動驗證：如果 LINE 帳號本身就有學校信箱則直接過關
        if (email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          // 否則需要進行手動 Email 驗證流程
          setNeedsVerification(true);
        }
      } catch (err) {
        console.error("LIFF 初始化失敗:", err);
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  const handleVerified = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    setIsReady(true);
    setNeedsVerification(false);
  };

  // 封裝登入方法
  const login = () => liff.login();

  if (isLoading && !needsVerification) {
    return <LoadingScreen />;
  }
  
  // 如果需要驗證且尚未通過認證，顯示驗證表單
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

// ==========================================
// Verification Form (UI 邏輯優化版)
// ==========================================
function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");

  const handleSendCode = () => {
    if (!schoolEmail.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setError("請輸入有效的南台信箱 (@stust.edu.tw)");
      return;
    }
    setError("");
    setShowTipDialog(true);
  };

  const handleVerify = () => {
    if (otpValue === VERIFICATION_CODE) {
      onVerified(schoolEmail);
    } else {
      setError("驗證碼錯誤");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">南台二手物平台</h1>
        <p className="text-slate-500 text-sm">請驗證您的學校信箱以繼續</p>
      </div>

      <div className="w-full max-w-sm bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">學校信箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="學號@stust.edu.tw"
                value={schoolEmail}
                onChange={(e) => { setSchoolEmail(e.target.value); setError(""); }}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            {error && !showOtpDialog && <p className="text-xs text-red-500 ml-1 font-medium">{error}</p>}
          </div>
          <Button onClick={handleSendCode} className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 transition-colors">
            <ShieldCheck className="w-4 h-4 mr-2" /> 發送驗證碼
          </Button>
          <p className="text-[10px] text-center text-slate-400 pt-2 font-medium tracking-widest uppercase">STUST Campus Only</p>
        </div>
      </div>

      {/* 提示對話框 */}
      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent className="rounded-3xl max-w-[90%] sm:max-w-sm border-none shadow-2xl">
          <DialogHeader className="items-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="text-xl">驗證碼已發送</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <p className="text-sm mb-4">系統已將驗證碼寄至您的信箱：<br/><span className="font-bold text-slate-900">{schoolEmail}</span></p>
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">測試環境驗證碼</p>
                <p className="text-3xl font-black text-blue-600 tracking-[0.2em]">{VERIFICATION_CODE}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => { setShowTipDialog(false); setShowOtpDialog(true); }} className="w-full rounded-xl h-12 font-bold bg-blue-600 mt-4">
            前往輸入
          </Button>
        </DialogContent>
      </Dialog>

      {/* OTP 輸入對話框 */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="rounded-3xl max-w-[90%] sm:max-w-sm border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-bold">輸入驗證碼</DialogTitle>
            <DialogDescription className="text-sm">請輸入 6 位數驗證碼</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup className="gap-2">
                {[...Array(6)].map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="w-11 h-14 text-xl font-bold rounded-xl border-slate-200" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
            <Button 
              onClick={handleVerify} 
              disabled={otpValue.length !== 6} 
              className="w-full h-12 rounded-xl font-bold bg-blue-600"
            >
              確認驗證
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <p className="text-sm text-slate-400 font-medium animate-pulse">正在與 LINE 連線...</p>
    </div>
  );
}
