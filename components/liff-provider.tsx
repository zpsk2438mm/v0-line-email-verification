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
}

interface LiffContextType {
  isReady: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  lineUserId: string | null;
}

const LiffContext = createContext<LiffContextType>({
  isReady: false,
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
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

function setStoredAuth(email?: string): void {
  if (typeof window === "undefined") return;
  const authData: AuthData = {
    verified: true,
    timestamp: Date.now(),
    email,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
}

function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isAuthValid(): boolean {
  const authData = getStoredAuth();
  if (!authData || !authData.verified) return false;

  const expiryMs = AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const isExpired = Date.now() - authData.timestamp > expiryMs;

  if (isExpired) {
    clearStoredAuth();
    return false;
  }

  return true;
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
function VerificationForm({
  onVerified,
}: {
  onVerified: (email: string) => void;
}) {
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
    // Simulate sending verification code
    alert(`驗證碼已發送至 ${schoolEmail}\n\n（模擬驗證碼：${VERIFICATION_CODE}）`);
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    // Simulate verification delay
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
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            南台二手物平台
          </h1>
          <p className="text-sm text-muted-foreground">
            請驗證您的學校信箱以繼續
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                學校信箱
              </label>
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
              {error && !showOtpDialog && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <Button
              onClick={handleSendCode}
              disabled={!schoolEmail}
              className="w-full"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              發送驗證碼
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              僅限南台科技大學師生使用
            </p>
          </div>
        </div>
      </div>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>輸入驗證碼</DialogTitle>
            <DialogDescription>
              驗證碼已發送至
              <br />
              <span className="font-medium text-foreground">{schoolEmail}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value);
                setError("");
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error && showOtpDialog && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleVerifyOtp}
              disabled={otpValue.length !== 6 || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  驗證中...
                </>
              ) : (
                "確認驗證"
              )}
            </Button>

            <button
              onClick={() => {
                setOtpValue("");
                alert(`驗證碼已重新發送至 ${schoolEmail}\n\n（模擬驗證碼：${VERIFICATION_CODE}）`);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              重新發送驗證碼
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// Loading Component
// ==========================================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">驗證身分中...</p>
      </div>
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

  const handleManualVerification = (email: string) => {
    setStoredAuth(email);
    setUserEmail(email);
    setIsAuthenticated(true);
    setNeedsVerification(false);
    setIsReady(true);
  };

  useEffect(() => {
    async function initializeLiff() {
      // Dev bypass: localhost always passes
      if (isLocalhost()) {
        console.log("[v0] Localhost detected - bypassing LIFF auth");
        setLineUserId("dev_user_localhost");
        setUserEmail("dev@stust.edu.tw");
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // Check persistent login first (7-day cache)
      if (isAuthValid()) {
        console.log("[v0] Valid auth cache found - skipping LIFF init");
        const stored = getStoredAuth();
        setUserEmail(stored?.email || null);
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // Initialize LIFF
      try {
        await liff.init({ liffId: LIFF_ID });
        console.log("[v0] LIFF initialized successfully");

        // Check if user is logged in
        if (!liff.isLoggedIn()) {
          console.log("[v0] User not logged in - redirecting to LINE login");
          liff.login();
          return;
        }

        // Get user email and LINE user ID from decoded ID token
        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email;
        const userId = decodedToken?.sub || null;
        console.log("[v0] User email:", email);
        console.log("[v0] LINE User ID:", userId);
        setUserEmail(email || null);
        setLineUserId(userId);

        // Verify email domain
        if (isEmailAllowed(email)) {
          console.log("[v0] Email verified - access granted");
          setStoredAuth(email || undefined);
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          // Email is not @stust.edu.tw - show verification form
          console.log("[v0] Email not school domain - showing verification form");
          setNeedsVerification(true);
        }
      } catch (error) {
        console.error("[v0] LIFF initialization failed:", error);
        // On error in production, show verification form as fallback
        setNeedsVerification(true);
      }

      setIsLoading(false);
    }

    initializeLiff();
  }, []);

  // Show loading screen
  if (isLoading && !needsVerification) {
    return <LoadingScreen />;
  }

  // Show verification form if needed
  if (needsVerification && !isAuthenticated) {
    return <VerificationForm onVerified={handleManualVerification} />;
  }

  // Return null until authenticated
  if (!isReady || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <LiffContext.Provider value={{ isReady, isAuthenticated, userEmail, lineUserId }}>
      {children}
    </LiffContext.Provider>
  );
}
