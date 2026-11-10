
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import ListingForm from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import {
  ShoppingBag,
  Loader2,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const router = useRouter();

  const {
    isAuthenticated,
    userEmail,
    lineUserId,
    sendOtp,
    verifyOtp,
    login,
    isLoading: liffLoading,
  } = useLiff();

  const [next, setNext] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 取得使用者原本想前往的頁面
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get("next"));
  }, []);

  // 驗證完成後，自動返回原本的頁面
  useEffect(() => {
    if (liffLoading || !lineUserId || !isAuthenticated) {
      return;
    }

    if (!next) return;

    // 防止跳轉至外部網址
    if (
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next.startsWith("/\\")
    ) {
      return;
    }

    // 首頁本身就是刊登商品頁
    if (next === "/") return;

    router.replace(next);
  }, [
    liffLoading,
    lineUserId,
    isAuthenticated,
    next,
    router,
  ]);

  // 發送學校信箱驗證碼
  const handleSendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@stust.edu.tw")) {
      setError("請使用南臺學校信箱 (@stust.edu.tw) 進行驗證");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await sendOtp(normalizedEmail);

      if (res.success) {
        setEmail(normalizedEmail);
        setStep(2);
        setMessage("6 位數驗證碼已成功發送到您的學校信箱！");
      } else {
        setError(
          res.error ||
            "驗證碼發送失敗，請檢查 SMTP 或環境變數設定"
        );
      }
    } catch (err) {
      console.error("發送驗證碼失敗:", err);
      setError("發送驗證碼時發生錯誤，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 驗證學校信箱驗證碼
  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("請輸入完整的 6 位數驗證碼");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await verifyOtp(email, otp);

      if (!res.success) {
        setError(
          res.error || "驗證碼錯誤或已過期，請重新輸入"
        );
        return;
      }

      setMessage("學校信箱驗證成功！正在進入系統...");

      // verifyOtp 會更新 LiffProvider 的驗證狀態。
      // 上方 useEffect 會自動處理 next 頁面跳轉。
    } catch (err) {
      console.error("驗證失敗:", err);
      setError("驗證過程發生錯誤，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 等待 LINE / Supabase 初始化
  if (liffLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
        <p className="text-gray-500 font-bold">
          正在同步您的 LINE 個人資料...
        </p>
      </div>
    );
  }

  // 完成 LINE + 學校信箱驗證
  const canAccess = Boolean(lineUserId) && isAuthenticated;

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>

        <h1 className="text-lg font-bold text-slate-800">
          南台二手物上架
        </h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {canAccess ? (
          <ListingForm />
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-50/80 max-w-md mx-auto my-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 tracking-wide">
                校園身分認證
              </h2>

              <p className="text-sm text-gray-400 mt-1 font-medium">
                保障交易安全，上架商品需完成 LINE 與南臺信箱驗證
              </p>
            </div>

            {!lineUserId && (
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm space-y-3">
                <p className="font-bold flex items-center gap-1">
                  ⚠️ 尚未完成 LINE 登入
                </p>

                <p className="text-xs text-amber-600 leading-relaxed">
                  請先使用 LINE 登入，系統才能取得您的 LINE User ID。
                </p>

                <Button
                  type="button"
                  onClick={login}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  使用 LINE 登入
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm font-semibold leading-relaxed">
                  {error}
                </div>
              </div>
            )}

            {message && (
              <div className="p-4 mb-4 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm font-semibold leading-relaxed">
                  {message}
                </div>
              </div>
            )}

            {/* 必須先完成 LINE 登入，才顯示學校信箱驗證 */}
            {lineUserId && !isAuthenticated && (
              <>
                {step === 1 ? (
                  <form
                    onSubmit={handleSendCode}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="auth-email"
                        className="font-bold text-gray-600"
                      >
                        南臺學號信箱 *
                      </Label>

                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />

                        <Input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) =>
                            setEmail(e.target.value)
                          }
                          placeholder="例如：4b1g0xxx@stust.edu.tw"
                          className="rounded-xl h-12 pl-11 border-gray-200 focus-visible:ring-[#D95300]"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-bold rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white transition-all shadow-md"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          正在發送驗證碼...
                        </span>
                      ) : (
                        "發送 6 位數驗證碼"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleVerifyCode}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label
                          htmlFor="auth-otp"
                          className="font-bold text-gray-600"
                        >
                          輸入 6 位數驗證碼 *
                        </Label>

                        <button
                          type="button"
                          className="text-xs text-[#D95300] font-bold hover:underline"
                          onClick={() => {
                            setStep(1);
                            setOtp("");
                            setError("");
                            setMessage("");
                          }}
                        >
                          修改信箱
                        </button>
                      </div>

                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />

                        <Input
                          id="auth-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(e) =>
                            setOtp(
                              e.target.value.replace(/\D/g, "")
                            )
                          }
                          placeholder="請輸入郵件中的 6 位數字"
                          className="rounded-xl h-12 pl-11 border-gray-200 focus-visible:ring-[#D95300] tracking-[0.5em] text-center font-mono text-lg font-bold"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-bold rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white transition-all shadow-md"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          正在核對中...
                        </span>
                      ) : (
                        "確認驗證並登入"
                      )}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
