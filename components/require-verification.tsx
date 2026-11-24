
"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";

import {
  Loader2,
  LogIn,
  Mail,
  ShoppingBag,
} from "lucide-react";

const LOGIN_NEXT_KEY = "login_next";

export function RequireVerification({
  children,
}: {
  children: ReactNode;
}) {
  const {
    isLoading,
    isLiffInit,
    lineUserId,
    isAuthenticated,
    login,
  } = useLiff();

  const router = useRouter();

  const hasLineLogin =
    Boolean(lineUserId);

  const hasSchoolVerification =
    isAuthenticated;

  const allowed =
    hasLineLogin &&
    hasSchoolVerification;

  // 記住目前完整頁面網址
  function rememberCurrentPage() {
    const target =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    sessionStorage.setItem(
      LOGIN_NEXT_KEY,
      target
    );

    return target;
  }

  function handleLineLogin() {
    rememberCurrentPage();
    login();
  }

  function handleSchoolVerification() {
    const target =
      rememberCurrentPage();

    router.push(
      `/?next=${encodeURIComponent(target)}`
    );
  }

  // 確認登入狀態
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />

        <p className="text-sm text-gray-500">
          正在確認登入狀態...
        </p>
      </div>
    );
  }

  // LIFF 初始化失敗
  if (!isLiffInit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="text-xl font-bold">
          LINE 服務暫時無法使用
        </h2>

        <p className="text-sm text-gray-500">
          請重新整理頁面後再試一次。
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="rounded-xl bg-[#D35400] px-6 py-3 font-bold text-white"
        >
          重新整理
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/products")
          }
          className="text-sm text-gray-500"
        >
          返回市集
        </button>
      </div>
    );
  }

  // 尚未登入 LINE
  if (!hasLineLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
          <LogIn className="h-8 w-8 text-green-600" />
        </div>

        <h2 className="text-xl font-bold">
          請先登入 LINE
        </h2>

        <p className="text-sm leading-relaxed text-gray-500">
          此功能需要完成 LINE 登入及學校信箱驗證。
          登入完成後將自動返回目前頁面。
        </p>

        <button
          type="button"
          onClick={handleLineLogin}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
        >
          <LogIn className="h-4 w-4" />
          使用 LINE 登入
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/products")
          }
          className="flex items-center gap-2 text-sm text-gray-500"
        >
          <ShoppingBag className="h-4 w-4" />
          先逛逛市集
        </button>
      </div>
    );
  }

  // 尚未完成學校信箱驗證
  if (!hasSchoolVerification) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
          <Mail className="h-8 w-8 text-[#D35400]" />
        </div>

        <h2 className="text-xl font-bold">
          請完成南臺校園信箱驗證
        </h2>

        <p className="text-sm leading-relaxed text-gray-500">
          請使用 @stust.edu.tw 學校信箱完成驗證。
          驗證成功後將返回目前頁面。
        </p>

        <button
          type="button"
          onClick={handleSchoolVerification}
          className="flex items-center gap-2 rounded-xl bg-[#D35400] px-6 py-3 font-bold text-white"
        >
          <Mail className="h-4 w-4" />
          前往信箱驗證
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/products")
          }
          className="flex items-center gap-2 text-sm text-gray-500"
        >
          <ShoppingBag className="h-4 w-4" />
          先逛逛市集
        </button>
      </div>
    );
  }

  // 完成雙重驗證
  if (allowed) {
    return <>{children}</>;
  }

  return null;
}
