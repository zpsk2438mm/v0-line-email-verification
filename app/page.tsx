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
  
  // 驗證表單控制狀態
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1: 輸入信箱, 2: 輸入驗證碼
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 1. 處理發送驗證碼
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
      setMessage("驗證碼已成功發送到您的學校信箱！");
    } else {
      setError(res.error || "驗證碼發送失敗，請檢查 SMTP 設定或稍後再試");
    }
    setIsSubmitting(false);
  };

  // 2. 處理核對驗證碼
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("請輸入 6 位數驗證碼");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const res = await verifyOtp(email, otp);
    if (!res.success) {
      setError(res.error || "驗證碼錯誤，請重新輸入");
    }
    // 驗證成功後，LiffProvider 會更新 isAuthenticated 狀態，此頁面會自動重繪切換到上架表單
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">南台二手物上架</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* 核心判斷：如果通過認證且拿到了 LINE ID，才放行顯示上架表單 */}
        {isAuthenticated && lineUserId ? (
          <ListingForm />
        ) : (
          /* 否則在原地渲染「驗證碼登入區塊」，不進行路由跳轉 */
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-50/80 max-w-md mx-auto my-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 tracking-wide">校園身分認證</h2>
              <p className="text-sm text-gray-400 mt-1 font-medium">保障交易安全，上架商品需驗證南臺信箱</p>
            </div>

            {/* LINE 身分提醒區塊 */}
            {!lineUserId && (
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm space-y-2">
                <p className="font-bold flex items-center gap-1">⚠️ 偵測到 LINE 未
