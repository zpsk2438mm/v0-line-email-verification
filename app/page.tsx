"use client";

import { useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { ListingForm } from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import { ShoppingBag, Loader2, Mail, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const { isAuthenticated, userEmail, lineUserId, sendOtp, verifyOtp, login } = useLiff();
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 階段 1：發送驗證碼
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith("@stust.edu.tw")) {
      setError("請使用南臺學校信箱 (@stust.edu.tw) 進行驗證");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setMessage("");

    const res = await sendOtp(email);
    if (res.success) {
      setStep(2);
      setMessage("6 位數驗證碼已成功發送到您的學校信箱！");
    } else {
      setError(res.error || "驗證碼發送失敗，請檢查 SMTP 或環境變數設定");
    }
    setIsSubmitting(false);
  };

  // 階段 2：核對驗證碼
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("請輸入完整的 6 位數驗證碼");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const res = await verifyOtp(email, otp);
    if (!res.success) {
      setError(res.error || "驗證碼錯誤或已過期，請重新輸入");
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      {/* 頂部導航欄 */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">南台二手物上架</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* 通過驗證且 LINE 綁定成功就直接顯示上架表單 */}
        {isAuthenticated && lineUserId ? (
          <ListingForm />
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-50/80 max-w-md mx-auto my-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 tracking-wide">校園身分認證</h2>
              <p className="text-sm text-gray-400 mt-1 font-medium">保障交易安全，上架商品需驗證南臺信箱</p>
            </div>

            {/* 提示 LINE 未連線防呆 */}
            {!lineUserId && (
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm space-y-2">
                <p className="font-bold flex items-center gap-1">⚠️ 偵測到 LINE 未連線</p>
                <p className="text-xs text-amber-600 leading-relaxed">請確保您是在 LINE 軟體內打開此網頁。若無反應，請點擊下方按鈕手動連線 LINE 身分。</p>
                <Button size="sm" onClick={login} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-8">
                  呼叫 LINE 登入
                </Button>
              </div>
            )}

            {/* 錯誤錯誤提示 */}
            {error && (
              <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm font-semibold leading-relaxed">{error}</div>
              </div>
            )}

            {/* 成功綠色提示 */}
            {message && (
              <div className="p-4 mb-4 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm font-semibold leading-relaxed">{message}</div>
              </div>
            )}

            {/* 步驟 1：輸入學號信箱 */}
            {step === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="font-bold text-gray-600">南臺學號信箱 *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      <Loader2 className="w-5 h-5 animate-spin" /> 正在發送驗證碼...
                    </span>
                  ) : (
                    "發送 6 位數驗證碼"
                  )}
                </Button>
              </form>
            ) : (
              /* 步驟 2：輸入 6 位數純數字 */
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="auth-otp" className="font-bold text-gray-600">輸入 6 位數驗證碼 *</Label>
                    <span className="text-xs text-[#D95300] font-bold cursor-pointer hover:underline" onClick={() => setStep(1)}>
                      修改信箱
                    </span>
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
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
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
                      <Loader2 className="w-5 h-5 animate-spin" /> 正在核對中...
                    </span>
                  ) : (
                    "確認驗證並登入"
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
