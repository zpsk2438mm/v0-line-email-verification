"use client";

import { useEffect, useState } from "react";
import { ListingForm } from "@/components/listing-form";
import { ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import liff from "@line/liff";

export default function Page() {
  const [liffObject, setLiffObject] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setError("環境變數 NEXT_PUBLIC_LIFF_ID 遺失，請檢查 Vercel 設定。");
          return;
        }

        await liff.init({ liffId });
        setLiffObject(liff);

        if (!liff.isLoggedIn()) {
          // 強制導向登入，使用當前網址作為回傳路徑
          liff.login({ redirectUri: window.location.href });
        } else {
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        console.error("LIFF Init SDK Error", err);
        setError("LINE 初始化失敗，請確認 Endpoint URL 是否與 LINE 後台一致。");
      }
    };

    initLiff();
  }, []);

  // 1. 錯誤顯示
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">{error}</h2>
        <p className="mt-2 text-sm text-muted-foreground">請檢查 Vercel 環境變數與 LINE Developer 設定</p>
      </div>
    );
  }

  // 2. 載入中顯示
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">身分驗證中，請稍候...</p>
      </div>
    );
  }

  // 3. 驗證成功後顯示原本的內容
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <ShoppingBag className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-foreground">
            南台二手物上架平臺
          </h1>
          <p className="text-xs text-muted-foreground">
            已通過 LINE 身分驗證
          </p>
        </div>
      </header>

      {/* Form card */}
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ListingForm />
        </div>
      </div>
    </main>
  );
}