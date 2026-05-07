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

// 配置
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
const VERIFICATION_CODE = "123456";

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
  sendLineMessage: (productName: string, price: number) => Promise<boolean>;
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

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      
      if (isLocal) {
        setUserProfile({ displayName: "南台測試員", pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=STUST" });
        setUserEmail("4b290005@stust.edu.tw");
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
        
        setUserProfile(profile);
        setLineUserId(profile.userId);
        setUserEmail(token?.email || null);

        if (token?.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
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
    init();
  }, []);

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
    <LiffContext.Provider value={{ 
      isReady, 
      isAuthenticated, 
      userEmail, 
      lineUserId, 
      userProfile, 
      sendLineMessage: async () => true, 
      closeWindow: () => liff.closeWindow() 
    }}>
      {children}
    </LiffContext.Provider>
  );
}

function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [showOtp, setShowOtp] = useState(false); // 控制對話框的關鍵狀態
  const [otp, setOtp] = useState("");

  const handleSendCode = () => {
    if (email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setShowOtp(true); // 強制開啟對話框
    } else {
      alert("請輸入正確的南台信箱格式");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4">
      {/* Logo 區域 */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0070f3] mb-6 shadow-xl shadow-blue-100">
          <GraduationCap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">南台二手物平台</h1>
        <p className="text-slate-500 mt-2">請驗證您的學校信箱以繼續</p>
      </div>

      {/* 輸入卡片 */}
      <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-[2rem] p-10 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 ml-1">學校信箱</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="your_id@stust.edu.tw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-2xl text-lg"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSendCode}
            className="w-full h-14 bg-[#7fbdf0] hover:bg-[#69ace4] text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-50 border-none text-lg"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            發送驗證碼
          </Button>

          <div className="pt-6 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400 font-semibold tracking-wider">僅限南台科技大學師生使用</p>
          </div>
        </div>
      </div>

      {/* 驗證碼彈窗 - 確保這個組件在 DOM 裡 */}
      <Dialog open={showOtp} onOpenChange={setShowOtp}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none p-10">
          <DialogHeader className="items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-[#0070f3]" />
            </div>
            <DialogTitle className="text-2xl font-bold">輸入驗證碼</DialogTitle>
            <DialogDescription className="text-center text-base">
              驗證碼已發送至 <br/>
              <span className="font-bold text-slate-900">{email}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-8 py-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup className="gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot 
                    key={i} 
                    index={i} 
                    className="rounded-xl border-2 border-slate-100 w-12 h-16 text-2xl font-black bg-slate-50 focus:border-[#0070f3]" 
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            
            <Button 
              className="w-full h-14 bg-[#0070f3] hover:bg-blue-600 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200"
              onClick={() => { 
                if(otp === VERIFICATION_CODE) {
                  onVerified(email);
                } else {
                  alert("驗證碼錯誤，請輸入 123456");
                  setOtp("");
                }
              }}
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-12 h-12 animate-spin text-[#0070f3] mb-4" />
      <p className="text-slate-400 font-medium">載入中...</p>
    </div>
  );
}
