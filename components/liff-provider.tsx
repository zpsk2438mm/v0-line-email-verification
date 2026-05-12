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

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  login: () => {},
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const token = await liff.getDecodedIDToken();
          if (token?.email?.endsWith(ALLOWED_DOMAIN)) {
            setUserEmail(token.email);
            setIsAuthenticated(true);
          } else {
            setNeedsVerification(true);
          }
        } else {
          setNeedsVerification(true);
        }
      } catch (e) {
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading) return <div>載入中...</div>;
  if (needsVerification && !isAuthenticated) {
    return <VerificationForm onVerified={(email) => { setUserEmail(email); setIsAuthenticated(true); }} />;
  }

  return (
    <LiffContext.Provider value={{ isAuthenticated, userEmail, login: () => liff.login() }}>
      {children}
    </LiffContext.Provider>
  );
}

function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [correctCode, setCorrectCode] = useState("");
  const [step, setStep] = useState(1); // 1: 輸入信箱, 2: 輸入 OTP
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.endsWith(ALLOWED_DOMAIN)) return alert("請使用學校信箱");
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCorrectCode(code);

    try {
      await fetch("/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      setStep(2);
    } catch (e) {
      alert("發送失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#D35400] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">南臺市集身分驗證</h2>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <Input placeholder="學號@stust.edu.tw" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            <Button onClick={sendCode} disabled={loading} className="w-full h-12 bg-[#D35400] hover:bg-[#A04000]">
              {loading ? <Loader2 className="animate-spin" /> : "傳送驗證碼"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-center text-sm text-slate-500">驗證碼已寄至 {email}</p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="gap-2">
                  {[...Array(6)].map((_, i) => <InputOTPSlot key={i} index={i} className="w-10 h-12 border-slate-200" />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={() => otp === correctCode ? onVerified(email) : alert("驗證碼錯誤")} className="w-full h-12 bg-slate-900">
              確認驗證
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-slate-400">返回修改信箱</Button>
          </div>
        )}
      </div>
    </div>
  );
}
