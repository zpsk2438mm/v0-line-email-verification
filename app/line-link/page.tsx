
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLiff } from "@/components/liff-provider";
import { contactRequest } from "@/lib/contact-client";
import {
  CheckCircle2,
  BellRing,
  Loader2,
  AlertCircle,
} from "lucide-react";

function LineLinkContent() {
  const params = useSearchParams();
  const ticket = params.get("ticket") || "";

  const {
    lineUserId,
    isAuthenticated,
    userEmail,
    isLoading,
    isLiffInit,
    login,
    sendOtp,
    verifyOtp,
  } = useLiff();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const validTicket = /^[a-f0-9]{64}$/.test(ticket);

  async function handleSendOtp() {
    setError("");
    setNotice("");

    const value = email.trim().toLowerCase();

    if (!value.endsWith("@stust.edu.tw")) {
      setError("請輸入南臺科技大學學校信箱");
      return;
    }

    setBusy(true);

    try {
      const result = await sendOtp(value);

      if (!result.success) {
        throw new Error(result.error || "寄送失敗");
      }

      setEmail(value);
      setOtpSent(true);
      setNotice("驗證碼已寄送，請到學校信箱查看。");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "寄送失敗"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const result = await verifyOtp(
        email.trim().toLowerCase(),
        otp.trim()
      );

      if (!result.success) {
        throw new Error(result.error || "驗證失敗");
      }

      setNotice("學校信箱驗證成功，可以開始配對！");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "驗證失敗"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLink() {
    if (busy) return;

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const result = await contactRequest(
        "/api/line-account-link",
        "POST",
        { ticket }
      );

      if (
        !result?.linkUrl ||
        typeof result.linkUrl !== "string"
      ) {
        throw new Error("伺服器沒有回傳配對連結");
      }

      const url = new URL(result.linkUrl);

      if (
        url.origin !== "https://access.line.me" ||
        url.pathname !== "/dialog/bot/accountLink"
      ) {
        throw new Error("LINE 配對網址驗證失敗");
      }

      // 導向 LINE 官方 Account Linking 確認頁面
      window.location.assign(url.toString());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "建立配對連結失敗"
      );
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex justify-center">
          <div className="rounded-full bg-orange-50 p-4">
            <BellRing className="h-9 w-9 text-[#D35400]" />
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-800">
          啟用 LINE 商品通知
        </h1>

        <p className="mt-3 text-center text-sm leading-6 text-slate-500">
          資想聽你說
          <br />
          完成一次安全配對，
          之後就能接收商品聯絡通知。
        </p>

        {!validTicket ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mb-2 h-5 w-5" />
            配對連結無效。
            請回 LINE 官方帳號重新傳送「啟用通知」。
          </div>
        ) : isLoading || !isLiffInit ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在確認登入狀態...
          </div>
        ) : !lineUserId ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              第一步：請先使用 LINE 登入網站。
            </p>

            <button
              onClick={login}
              className="w-full rounded-xl bg-[#06C755] px-4 py-3 font-bold text-white"
            >
              使用 LINE 登入
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              第二步：驗證南臺學校信箱。
            </p>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="學號@stust.edu.tw"
              disabled={busy || otpSent}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
            />

            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={busy}
                className="w-full rounded-xl bg-[#D35400] px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? "寄送中..." : "寄送學校信箱驗證碼"}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="輸入信箱驗證碼"
                  disabled={busy}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
                />

                <button
                  onClick={handleVerifyOtp}
                  disabled={busy || !otp.trim()}
                  className="w-full rounded-xl bg-[#D35400] px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  {busy ? "驗證中..." : "確認驗證碼"}
                </button>

                <button
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setNotice("");
                  }}
                  disabled={busy}
                  className="w-full text-sm text-slate-500 underline"
                >
                  重新寄送驗證碼
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">
                  身分驗證已完成
                </p>
                <p className="mt-1 break-all">
                  {userEmail}
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              最後一步：點擊下方按鈕，
              前往 LINE 官方確認帳號配對。
            </p>

            <button
              onClick={handleLink}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D35400] px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {busy && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {busy ? "正在建立配對..." : "確認啟用 LINE 通知"}
            </button>
          </div>
        )}

        {notice && (
          <div className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          配對連結有效時間為 10 分鐘。
          <br />
          請勿將專屬配對網址分享給他人。
        </p>
      </div>
    </main>
  );
}

export default function LineLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
        </div>
      }
    >
      <LineLinkContent />
    </Suspense>
  );
}
