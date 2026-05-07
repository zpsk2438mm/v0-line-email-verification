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
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
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
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading && !needsVerification) return <LoadingScreen />;
  
  if (needsVerification && !isAuthenticated) {
    return <VerificationForm onVerified={(email) => {
      setUserEmail(email); 
      setIsAuthenticated(true);
      setNeedsVerification(false);
      setIsReady(true);
    }} />;
  }

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId, userProfile, sendLineMessage: async () => true, closeWindow: () => liff.closeWindow() }}>
      {children}
    </LiffContext.Provider>
  );
}

function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50 p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0070f3] mb-4 shadow-lg shadow-blue-200">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">南台二手物平台</h1>
        <p className="text-slate-500 mt-2">請驗證您的學校信箱以繼續</p>
      </div>

      <div className="w-full max-w-[400px] bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">學校信箱</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="your_id@stust.edu.tw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
              />
            </div>
          </div>
          <Button 
            onClick={() => setShowOtp(true)} 
            disabled={!email.includes(ALLOWED_DOMAIN)}
            className="w-full h-12 bg-[#7fbdf0] hover:bg-blue-500 text-white font-bold rounded-xl transition-all border-none"
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            發送驗證碼
          </Button>
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">僅限南台科技大學師生使用</p>
          </div>
        </div>
      </div>

      <Dialog open={showOtp} onOpenChange={setShowOtp}>
        <DialogContent className="sm:max-w-md rounded-3xl border-none">
          <DialogHeader className="items-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-[#0070f3]" />
            </div>
            <DialogTitle className="text-xl">輸入驗證碼</DialogTitle>
            <DialogDescription className="text-center">
              驗證碼已發送至 <span className="font-semibold text-slate-900">{email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="rounded-lg border-slate-200 w-11 h-13 text-lg font-bold" />)}
              </InputOTPGroup>
            </InputOTP>
            <Button 
              className="w-full h-12 bg-[#0070f3] hover:bg-blue-600 rounded-xl font-bold"
              onClick={() => { if(otp === VERIFICATION_CODE) onVerified(email); else alert("驗證碼錯誤"); }}
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
  return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-[#0070f3]" /></div>;
}
