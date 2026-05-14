"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // 確保路徑正確
import { ListingForm } from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 檢查快取裡有沒有登入資訊
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 如果沒登入，才跳轉去登入頁 (假設路徑是 /login)
        router.push("/login");
      } else {
        // 有登入，直接關閉載入狀態，顯示內容
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">載入中...</div>;
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">南台二手物上架</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <ListingForm />
      </div>
    </main>
  );
}
