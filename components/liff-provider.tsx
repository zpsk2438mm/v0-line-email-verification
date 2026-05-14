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
import { Mail, ShieldCheck, Loader2, GraduationCap, AlertCircle } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const ALLOWED_DOMAIN = "@stust.edu.tw";
// 這裡填入你在 Resend 側邊欄左下角看到的那個 Gmail
const DEVELOPER_EMAIL = "wu8888712@gmail.com"; 

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  login: () => {},
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
          
          const token = liff.getDecodedIDToken();
          // 如果是南臺信箱或是開發者本人信箱，直接通過
          if (token?.email?.endsWith(ALLOWED_DOMAIN) || token?.email === DEVELOPER_EMAIL) {
            setUserEmail(token.email || DEVELOPER_EMAIL);
            setIsAuthenticated(true);
          } else {
            setNeedsVerification(true);
          }
        } else {
          setNeedsVerification(true);
        }
      } catch (e) {
        console.error("LIFF Init Error:", e);
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
      <p className="text-slate-500 font-medium italic">校園市集載入中...</p>
    </div>
  );

  if (needsVerification && !isAuthenticated) {
    return (
      <VerificationForm 
        onVerified={(email) => { 
          setUserEmail(email); 
          setIsAuthenticated(true); 
          if (liff.isLoggedIn()) {
            liff.getProfile().then(p => setLineUserId(p.userId));
          }
        }} 
      />
    );
  }

  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      login: () => liff.login() 
    }}>
      {children}
    </LiffContext.Provider>
  );
}

function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [correctCode, setCorrectCode] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    
    // 修改驗證邏輯：必須是南臺信箱 OR 開發者白名單信箱
    const isStust = targetEmail.endsWith(ALLOWED_DOMAIN);
    const isDev = targetEmail === DEVELOPER_EMAIL;

    if (!isStust && !isDev) {
      setError("請使用南臺學校信箱 (@stust.edu.tw)");
      return;
    }
    
    setError("");
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "發送失敗");
      }

      setCorrectCode(code);
      setStep(2);
    } catch (e: any) {
      // 這裡增加一個友善提示，告知為什麼會失敗
      if (targetEmail.endsWith(ALLOWED_DOMAIN)) {
        setError("目前為開發模式，暫時只能寄送給開發者 Gmail 測試");
      } else {
        setError(e.message || "系統錯誤");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-orange-100/50 border border-orange-50">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#D35400] to-[#FF8C00] rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg shadow-orange-200">
            <GraduationCap className="w-12 h-12 text-white -rotate-3" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">南臺市集身分驗證</h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            測試期間請輸入：<br/>
            <span className="text-[#D35400] font-mono">{DEVELOPER_EMAIL}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">Email Address</label>
              <Input 
                placeholder="請輸入註冊 Resend 的 Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus-visible:ring-[#D35400] text-lg font-medium" 
              />
            </div>
            <Button 
              onClick={sendCode} 
              disabled={loading} 
              className="w-full h-14 bg-[#D35400] hover:bg-[#A04000] rounded-2xl text-lg font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" /> : "獲取驗證碼"}
            </Button>
            <p className="text-center text-[10px] text-slate-300 font-bold tracking-tighter uppercase">Developer Sandbox Mode Enabled</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in-95">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-600 mb-1">驗證郵件已發送</p>
              <p className="text-xs text-[#D35400] font-mono bg-orange-50 py-1 px-3 rounded-full inline-block">{email}</p>
            </div>
            
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-3">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot 
                      key={i} 
                      index={i} 
                      className="w-11 h-14 border-2 rounded-xl border-slate-100 text-xl font-black text-[#D35400] focus:border-[#D35400]" 
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => otp === correctCode ? onVerified(email) : setError("驗證碼錯誤，請重新輸入")} 
                className="w-full h-14 bg-slate-900 hover:bg-black rounded-2xl text-lg font-bold shadow-xl transition-all active:scale-95 text-white"
              >
                完成身分驗證
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="w-full h-12 text-slate-400 font-bold hover:bg-transparent hover:text-slate-600"
              >
                返回修改信箱
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
