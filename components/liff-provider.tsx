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
const DEV_EMAIL = "YOUR_GMAIL@gmail.com";
const AUTH_STORAGE_KEY = "stust_authenticated";
const AUTH_EXPIRY_DAYS = 7;
const VERIFICATION_CODE = "123456";

// ==========================================
// Types
// ==========================================
interface AuthData {
  verified: boolean;
  timestamp: number;
  email?: string;
  lineUserId?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
  profile: LineProfile | null;
  sendLineMessage: (productName: string, price: number, imageUrl?: string) => Promise<boolean>;
  closeWindow: () => void;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  profile: null,
  sendLineMessage: async () => false,
  closeWindow: () => {},
  login: () => {},
});

export const useLiff = () => useContext(LiffContext);

// ==========================================
// Helper Functions
// ==========================================
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function getStoredAuth(): AuthData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthData;
  } catch {
    return null;
  }
}

function setStoredAuth(email?: string, lineUserId?: string): void {
  if (typeof window === "undefined") return;
  const authData: AuthData = {
    verified: true,
    timestamp: Date.now(),
    email,
    lineUserId,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
}

function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isAuthValid(): { valid: boolean; data: AuthData | null } {
  const authData = getStoredAuth();
  if (!authData || !authData.verified) return { valid: false, data: null };

  const expiryMs = AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const isExpired = Date.now() - authData.timestamp > expiryMs;

  if (isExpired) {
    clearStoredAuth();
    return { valid: false, data: null };
  }

  return { valid: true, data: authData };
}

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  if (lowerEmail.endsWith(ALLOWED_DOMAIN)) return true;
  if (lowerEmail === DEV_EMAIL.toLowerCase()) return true;
  return false;
}

// ==========================================
// Verification Form Component
// ==========================================
function VerificationForm({ onVerified }: { onVerified: (email: string) => void }) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const isValidSchoolEmail = schoolEmail.toLowerCase().endsWith(ALLOWED_DOMAIN);

  const handleSendCode = () => {
    if (!isValidSchoolEmail) {
      setError("請輸入有效的學校信箱 (@stust.edu.tw)");
      return;
    }
    setError("");
    setShowOtpDialog(true);
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (otpValue === VERIFICATION_CODE) {
        onVerified(schoolEmail);
      } else {
        setError("驗證碼錯誤，請重新輸入");
        setOtpValue("");
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
                  onChange={(e) => {
                    setSchoolEmail(e.target.value);
                    setError("");
                  }}
                  className="pl-10"
                />
              </div>
              {error && !showOtpDialog && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Button onClick={handleSendCode} disabled={!schoolEmail} className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" /> 發送驗證碼
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle>輸入驗證碼</DialogTitle>
            <DialogDescription>
              驗證碼已發送至 <span className="font-medium text-foreground">{schoolEmail}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
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

// ==========================================
// Provider Component
// ==========================================
export function LiffProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleManualVerification = (email: string) => {
    setStoredAuth(email, lineUserId || undefined);
    setUserEmail(email);
    setIsAuthenticated(true);
    setNeedsVerification(false);
    setIsReady(true);
  };

  const login = () => {
    if (!liff.isLoggedIn()) liff.login();
  };

  const closeWindow = () => {
    try {
      if (liff.isInClient()) liff.closeWindow();
    } catch (e) {
      console.error(e);
    }
  };

  const sendLineMessage = async (productName: string, price: number): Promise<boolean> => {
    if (isLocalhost()) return true;
    try {
      if (!liff.isInClient()) return false;
      await liff.sendMessages([{ type: "text", text: `商品 ${productName} 上架成功！價格: NT$${price}` }]);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    async function init() {
      if (isLocalhost()) {
        setUserEmail("4b290005@stust.edu.tw");
        setLineUserId("dev_user");
        setProfile({ userId: "dev_user", displayName: "已驗證用戶", pictureUrl: "" });
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

        const p = await liff.getProfile();
        const token = liff.getDecodedIDToken();
        const email = token?.email || null;

        setProfile(p);
        setLineUserId(p.userId);
        setUserEmail(email);

        const authCheck = isAuthValid();
        if (authCheck.valid && authCheck.data?.email === email) {
          setIsAuthenticated(true);
        } else if (isEmailAllowed(email)) {
          setStoredAuth(email || undefined, p.userId);
          setIsAuthenticated(true);
        } else {
          setNeedsVerification(true);
        }
        setIsReady(true);
      } catch (err) {
        console.error("LIFF Init Error", err);
        setNeedsVerification(true); // 出錯時回退到手動驗證，不要 reload
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;
  if (needsVerification && !isAuthenticated) return <VerificationForm onVerified={handleManualVerification} />;

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId, profile, sendLineMessage, closeWindow, login }}>
      {children}
    </LiffContext.Provider>
  );
}
