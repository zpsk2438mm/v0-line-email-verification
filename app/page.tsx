"use client";

import { useEffect, useState, useRef } from "react";
import { ListingForm } from "@/components/listing-form";
import { ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import liff from "@line/liff";

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitRef = useRef(false); // 防止 React StrictMode 跑兩次

  useEffect(() => {
    if (isInitRef.current) return;
    isInitRef.current = true;

    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setError("環境變數遺失，請檢查 Vercel Settings -> Environment Variables");
          return;
        }

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // 加上這行防止在跳轉過程中重複執行
          if (!window.location.search.includes("code=")) {
            liff.login({ redirectUri: "https://v0-supabase-form-integration-two.vercel.app/" });
          }
        } else {
          setIsLoggedIn(true);
        }
      } catch (err: any) {
        setError("LINE 初始化失敗，請檢查網址是否與 Endpoint URL 一致");
      }
    };

    initLiff();
  }, []);

  if (error) {
    return <div className="p-10 text-center font-bold text-red-500">{error}</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="animate-spin mb-2" />
        <p>南台驗證系統啟動中...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-5 py-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <ShoppingBag className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold">南台二手物上架</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <ListingForm />
      </div>
    </main>
  );
}