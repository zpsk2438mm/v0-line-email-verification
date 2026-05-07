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

// 新增 Profile 類型定義
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
  profile: LineProfile | null; // 新增 profile 欄位
  sendLineMessage: (productName: string, price: number, imageUrl?: string) => Promise<boolean>;
  closeWindow: () => void;
  login: () => void; // 新增 login 函數方便調用
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
    alert(`驗證碼已發送至 ${schoolEmail}\n\n（模擬驗證碼：${VERIFICATION_CODE}）`);
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
          <h1 className="text-xl font-bold text-foreground mb-2">
            南台二手物平台
          </h1>
          <p className="text-sm text-muted-foreground">
            請驗證您的學校信箱以繼續
          </p>
        </div>

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
  const [profile, setProfile] = useState<LineProfile | null>(null); // 新增 profile 狀態
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initRetryCount, setInitRetryCount] = useState(0);

  const handleManualVerification = (email: string) => {
    setStoredAuth(email, lineUserId || undefined);
    setUserEmail(email);
    setIsAuthenticated(true);
    setNeedsVerification(false);
    setIsReady(true);
  };

  const login = () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  const sendLineMessage = async (productName: string, price: number, imageUrl?: string): Promise<boolean> => {
    if (isLocalhost()) {
      console.log("[v0] Localhost - simulating LINE message send");
      return true;
    }

    try {
      if (!liff.isInClient()) {
        console.log("[v0] Not in LINE client, cannot send message");
        return false;
      }

      const flexMessage: liff.LiffMessage = {
        type: "flex",
        altText: `上架成功！${productName} - NT$${price}`,
        contents: {
          type: "bubble",
          hero: imageUrl ? {
            type: "image",
            url: imageUrl,
            size: "full",
            aspectRatio: "4:3",
            aspectMode: "cover",
          } : undefined,
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "上架成功！",
                weight: "bold",
                size: "xl",
                color: "#22c55e",
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "商品",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 1,
                      },
                      {
                        type: "text",
                        text: productName,
                        wrap: true,
                        color: "#666666",
                        size: "sm",
                        flex: 4,
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      {
                        type: "text",
                        text: "價格",
                        color: "#aaaaaa",
                        size: "sm",
                        flex: 1,
                      },
                      {
                        type: "text",
                        text: `NT$${price.toLocaleString()}`,
                        wrap: true,
                        color: "#1a73e8",
                        size: "sm",
                        weight: "bold",
                        flex: 4,
                      },
                    ],
                  },
                ],
              },
              {
                type: "text",
                text: "請靜待管理員審核",
                size: "xs",
                color: "#888888",
                margin: "lg",
              },
            ],
          },
        } as liff.FlexBubble,
      };

      await liff.sendMessages([flexMessage]);
      console.log("[v0] LINE message sent successfully");
      return true;
    } catch (error) {
      console.error("[v0] Failed to send LINE message:", error);
      return false;
    }
  };

  const closeWindow = () => {
    if (isLocalhost()) {
      console.log("[v0] Localhost - simulating window close");
      return;
    }

    try {
      if (liff.isInClient()) {
        liff.closeWindow();
      }
    } catch (error) {
      console.error("[v0] Failed to close window:", error);
    }
  };

  useEffect(() => {
    async function initializeLiff() {
      if (isLocalhost()) {
        setLineUserId("dev_user_localhost");
        setUserEmail("dev@stust.edu.tw");
        // 本地測試用假資料
        setProfile({
          userId: "dev_user_localhost",
          displayName: "開發者測試",
          pictureUrl: "https://via.placeholder.com/150"
        });
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      const authCheck = isAuthValid();
      
      try {
        await liff.init({ liffId: LIFF_ID });
        await liff.ready;

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // 核心修改：獲取完整的 Profile 資料
        const lineProfile = await liff.getProfile();
        setProfile(lineProfile);
        setLineUserId(lineProfile.userId);

        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email || null;
        setUserEmail(email);

        // 如果快取有效且信箱一致，直接通過
        if (authCheck.valid && authCheck.data && authCheck.data.email === email) {
          setIsAuthenticated(true);
          setIsReady(true);
          setIsLoading(false);
          return;
        }

        if (isEmailAllowed(email)) {
          setStoredAuth(email || undefined, lineProfile.userId);
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (error) {
        console.error("[v0] LIFF initialization failed:", error);
        if (initRetryCount < 2) {
          setInitRetryCount((prev) => prev + 1);
          setTimeout(() => { window.location.reload(); }, 1500);
          return;
        }
        setNeedsVerification(true);
      }
      setIsLoading(false);
    }

    initializeLiff();
  }, [initRetryCount]);

  if (isLoading && !needsVerification) {
    return <LoadingScreen />;
  }

  if (needsVerification && !isAuthenticated) {
    return <VerificationForm onVerified={handleManualVerification} />;
  }

  if (!isReady || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <LiffContext.Provider value={{ 
      isReady, 
      isAuthenticated, 
      userEmail, 
      lineUserId, 
      profile, // 導出 profile
      sendLineMessage, 
      closeWindow,
      login
    }}>
      {children}
    </LiffContext.Provider>
  );
}
