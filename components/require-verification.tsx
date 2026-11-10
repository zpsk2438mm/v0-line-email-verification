
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { Loader2 } from "lucide-react";

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

  const pathname = usePathname();
  const router = useRouter();

  const hasLineLogin = Boolean(lineUserId);
  const hasSchoolVerification = isAuthenticated;

  const allowed = hasLineLogin && hasSchoolVerification;

  useEffect(() => {
    if (isLoading || !isLiffInit || allowed) return;

    // 不在這裡強制跳轉或自動登入，
    // 避免與首頁的驗證流程產生無限循環。
  }, [isLoading, isLiffInit, allowed]);

  if (isLoading || !isLiffInit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <p className="text-sm text-gray-500">
          正在確認登入狀態...
        </p>
      </div>
    );
  }

  if (!hasLineLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="text-xl font-bold">
          請先登入 LINE
        </h2>

        <p className="text-gray-500">
          刊登商品及個人中心需要先完成 LINE 登入。
        </p>

        <button
          type="button"
          onClick={login}
          className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white"
        >
          使用 LINE 登入
        </button>
      </div>
    );
  }

  if (!hasSchoolVerification) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="text-xl font-bold">
          請完成南臺校園信箱驗證
        </h2>

        <p className="text-gray-500">
          請使用 @stust.edu.tw 學校信箱完成驗證。
        </p>

        <button
          type="button"
          onClick={() => {
            const target =
              window.location.pathname +
              window.location.search;

            router.push(
              `/?next=${encodeURIComponent(target)}`
            );
          }}
          className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white"
        >
          前往信箱驗證
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
