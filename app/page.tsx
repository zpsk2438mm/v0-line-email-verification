"use client";

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { contactRequest } from "@/lib/contact-client";
import ListingForm from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import {
  ShoppingBag,
  Loader2,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Link2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactStatus =
  | "loading"
  | "missing"
  | "ready"
  | "error";

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

  // 學校信箱驗證
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 賣家 LINE 聯絡方式
  const [contactStatus, setContactStatus] =
    useState<ContactStatus>("loading");

  const [lineFriendUrl, setLineFriendUrl] =
    useState("");

  const [savingContact, setSavingContact] =
    useState(false);

  const [contactError, setContactError] =
    useState("");

  const [contactMessage, setContactMessage] =
    useState("");

  const canAccess =
    Boolean(lineUserId) && isAuthenticated;

  // 取得原本想前往的頁面
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    setNext(params.get("next"));
  }, []);

  // 登入完成後，返回原本頁面
  useEffect(() => {
    if (
      liffLoading ||
      !lineUserId ||
      !isAuthenticated
    ) {
      return;
    }

    if (!next) return;

    // 防止跳轉到外部網址
    if (
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next.startsWith("/\\")
    ) {
      return;
    }

    if (next === "/") return;

    router.replace(next);
  }, [
    liffLoading,
    lineUserId,
    isAuthenticated,
    next,
    router,
  ]);

  // 檢查賣家是否設定 LINE 加好友連結
  const checkSellerContact = useCallback(
    async () => {
      if (!canAccess) {
        setContactStatus("loading");
        return;
      }

      setContactStatus("loading");
      setContactError("");

      try {
        const data = await contactRequest(
          "/api/seller-contact"
        );

        const savedUrl =
          typeof data.lineFriendUrl === "string"
            ? data.lineFriendUrl.trim()
            : "";

        setLineFriendUrl(savedUrl);

        if (savedUrl) {
          setContactStatus("ready");
        } else {
          setContactStatus("missing");
        }
      } catch (err) {
        console.error(
          "檢查 LINE 聯絡方式失敗:",
          err
        );

        setContactStatus("error");

        setContactError(
          err instanceof Error
            ? err.message
            : "無法確認 LINE 聯絡方式"
        );
      }
    },
    [canAccess, lineUserId]
  );

  // 每次進入刊登頁面，自動檢查
  useEffect(() => {
    if (!liffLoading && canAccess) {
      checkSellerContact();
    }
  }, [
    liffLoading,
    canAccess,
    checkSellerContact,
  ]);

  // 驗證 LINE 私人加好友連結
  const validLineUrl = (value: string) => {
    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        url.hostname === "line.me" &&
        url.pathname.startsWith("/ti/p/") &&
        url.pathname.length > "/ti/p/".length &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  };

  // 儲存賣家的 LINE 聯絡方式
  const handleSaveContact = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const cleanUrl = lineFriendUrl.trim();

    setContactError("");
    setContactMessage("");

    if (!cleanUrl) {
      setContactError(
        "請先輸入你的 LINE 私人加好友連結"
      );
      return;
    }

    if (!validLineUrl(cleanUrl)) {
      setContactError(
        "請輸入有效的 LINE 加好友連結，格式為 https://line.me/ti/p/..."
      );
      return;
    }

    setSavingContact(true);

    try {
      const result = await contactRequest(
        "/api/seller-contact",
        "PUT",
        {
          lineFriendUrl: cleanUrl,
        }
      );

      if (result?.success !== true) {
        throw new Error(
          "LINE 聯絡方式儲存失敗"
        );
      }

      // 儲存成功後，再向伺服器確認
      const saved = await contactRequest(
        "/api/seller-contact"
      );

      const confirmedUrl =
        typeof saved.lineFriendUrl === "string"
          ? saved.lineFriendUrl.trim()
          : "";

      if (
        !confirmedUrl ||
        !validLineUrl(confirmedUrl)
      ) {
        throw new Error(
          "無法確認已儲存的 LINE 聯絡方式"
        );
      }

      setLineFriendUrl(confirmedUrl);
      setContactMessage(
        "LINE 聯絡方式設定成功！"
      );

      // 開放刊登表單
      setContactStatus("ready");
    } catch (err) {
      console.error(
        "儲存 LINE 聯絡方式失敗:",
        err
      );

      setContactError(
        err instanceof Error
          ? err.message
          : "儲存失敗，請稍後再試"
      );
    } finally {
      setSavingContact(false);
    }
  };

  // 發送學校信箱驗證碼
  const handleSendCode = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail.endsWith(
        "@stust.edu.tw"
      )
    ) {
      setError(
        "請使用南臺學校信箱 (@stust.edu.tw) 進行驗證"
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await sendOtp(
        normalizedEmail
      );

      if (res.success) {
        setEmail(normalizedEmail);
        setStep(2);

        setMessage(
          "6 位數驗證碼已成功發送到您的學校信箱！"
        );
      } else {
        setError(
          res.error ||
            "驗證碼發送失敗，請檢查 SMTP 或環境變數設定"
        );
      }
    } catch (err) {
      console.error(
        "發送驗證碼失敗:",
        err
      );

      setError(
        "發送驗證碼時發生錯誤，請稍後再試"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 驗證學校信箱
  const handleVerifyCode = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError(
        "請輸入完整的 6 位數驗證碼"
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await verifyOtp(
        email,
        otp
      );

      if (!res.success) {
        setError(
          res.error ||
            "驗證碼錯誤或已過期，請重新輸入"
        );
        return;
      }

      setMessage(
        "學校信箱驗證成功！正在進入系統..."
      );
    } catch (err) {
      console.error(
        "驗證失敗:",
        err
      );

      setError(
        "驗證過程發生錯誤，請稍後再試"
      );
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

        {/* 已完成 LINE 與學校信箱驗證 */}
        {canAccess ? (
          <>
            {/* 正在檢查 LINE 聯絡方式 */}
            {contactStatus === "loading" && (
              <div className="bg-white rounded-3xl p-8 shadow-sm text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mx-auto" />

                <h2 className="font-black text-lg text-slate-800">
                  正在檢查 LINE 聯絡方式
                </h2>

                <p className="text-sm text-slate-500">
                  請稍候，系統正在確認你是否已設定私人 LINE 加好友連結。
                </p>
              </div>
            )}

            {/* 檢查失敗 */}
            {contactStatus === "error" && (
              <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />

                <h2 className="text-xl font-black text-center">
                  無法確認 LINE 聯絡方式
                </h2>

                <p className="text-sm text-red-600 text-center">
                  {contactError}
                </p>

                <Button
                  type="button"
                  onClick={checkSellerContact}
                  className="w-full bg-[#D35400] hover:bg-[#A04000] text-white rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新檢查
                </Button>
              </div>
            )}

            {/* 尚未設定 LINE 加好友連結 */}
            {contactStatus === "missing" && (
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 space-y-5">

                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle className="w-8 h-8 text-[#D35400]" />
                  </div>

                  <h2 className="text-2xl font-black text-slate-800">
                    請先設定 LINE 聯絡方式
                  </h2>

                  <p className="text-sm text-slate-500 leading-relaxed">
                    為了讓買家順利聯絡你，
                    首次刊登商品前，
                    請先設定私人 LINE 加好友連結。
                    只需要設定一次，
                    之後就能直接刊登。
                  </p>
                </div>

                <div className="bg-orange-50 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-bold text-[#A04000]">
                    如何取得 LINE 加好友連結？
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    1. 開啟 LINE App
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    2. 進入「加入好友」→「我的行動條碼」
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    3. 選擇分享或複製個人加好友連結
                  </p>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    4. 將連結貼到下方欄位
                  </p>
                </div>

                <form
                  onSubmit={handleSaveContact}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="seller-line-url"
                      className="font-bold text-slate-700"
                    >
                      我的 LINE 加好友連結 *
                    </Label>

                    <div className="relative">
                      <Link2 className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

                      <Input
                        id="seller-line-url"
                        type="url"
                        required
                        placeholder="https://line.me/ti/p/..."
                        value={lineFriendUrl}
                        onChange={(e) => {
                          setLineFriendUrl(
                            e.target.value
                          );

                          setContactError("");
                        }}
                        disabled={savingContact}
                        className="h-12 pl-11 rounded-xl"
                      />
                    </div>
                  </div>

                  {contactError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-red-50 text-red-600 text-sm"
                    >
                      {contactError}
                    </div>
                  )}

                  {contactMessage && (
                    <div
                      role="status"
                      className="p-3 rounded-xl bg-green-50 text-green-700 text-sm"
                    >
                      {contactMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={savingContact}
                    className="w-full h-12 bg-[#D35400] hover:bg-[#A04000] text-white font-bold rounded-xl"
                  >
                    {savingContact ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        儲存中...
                      </>
                    ) : (
                      "儲存並開始刊登"
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-slate-400">
                  設定成功後，系統會自動開啟商品刊登表單。
                </p>
              </div>
            )}

            {/* 已設定 LINE 聯絡方式，開放刊登 */}
            {contactStatus === "ready" && (
              <>
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />

                  <p className="text-sm font-bold text-emerald-700">
                    LINE 聯絡方式已設定，可以開始刊登商品！
                  </p>
                </div>

                <ListingForm />
              </>
            )}
          </>
        ) : (
          /* 尚未完成 LINE / 學校信箱驗證 */
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

            {/* 學校信箱驗證 */}
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
                              e.target.value.replace(
                                /\D/g,
                                ""
                              )
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
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
