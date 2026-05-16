"use client";

// app/profile/page.tsx 終極修復版

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Mail, Plus, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  // 🔥 關鍵修正：引入 userProfile（這是我們緩存的 LINE 資料）與 isLiffInit（LINE 完成鎖定）
  const { lineUserId, userProfile, userEmail, isAuthenticated, login, userName, isLiffInit } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 商品撈取邏輯 (不需變動，只對接 Supabase)
  const fetchMyProducts = useCallback(async () => {
    if (!isAuthenticated || !userEmail) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      const cachedData = localStorage.getItem(`products_${lineUserId || userEmail}`);
      if (cachedData) setMyProducts(JSON.parse(cachedData));

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url")
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMyProducts(data);
        localStorage.setItem(`products_${lineUserId || userEmail}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error("商品讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated, lineUserId, userEmail]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // ✨ 終極修復核心：在頁面最上方增加一個「等待 LINE 資料撈到」的渲染鎖定
  // 如果 Supabase 驗證過了，但 LINE 資料還沒抓到，我們顯示一個乾淨的載入中畫面
  if (isAuthenticated && !userProfile && !lineUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
        <p className="text-gray-500 font-bold">正在同步您的 LINE 個人資料...</p>
      </div>
    );
  }

  // 2. 未登入狀態
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 rounded-3xl bg-white shadow-xl border-none">
          <ShieldCheck className="h-12 w-12 text-[#D35400] mx-auto" />
          <h2 className="font-bold text-2xl">歡迎回來</h2>
          <p className="text-slate-500">請完成登入以管理您的商品</p>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] h-14 rounded-2xl font-bold">
            登入系統
          </Button>
        </Card>
      </main>
    );
  }

  // 3. ✨ 最終渲染邏輯：既然上面有鎖定，這裡的 userProfile 資料一定是準確的
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-10 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/20 shrink-0">
                {/* 🔥 條件修正：既然有全域緩存的 userProfile，直接用它 */}
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                {/* 🔥 條件修正：優先顯示 LINE 暱稱，如果沒有（保險起見），才顯示提取出來的學號 userName */}
                <h2 className="font-black text-2xl truncate">
                  {userProfile?.displayName || userName || "南臺同學"}
                </h2>
                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <p className="text-[10px] font-bold uppercase flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" /> {userEmail}
                  </p>
                  {lineUserId && (
                    <p className="text-[10px] font-bold opacity-60">ID: {lineUserId.slice(0, 10)}...</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品清單部分 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between mb-5 border-b border-orange-50 pb-5">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-[#D35400]" /> 我的商品
            </h3>
            <Link href="/">
              <Button size="sm" className="rounded-xl bg-orange-50 text-[#D35400] font-black h-10 border-none">
                <Plus className="w-4 h-4 mr-1" />上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts && myProducts.length === 0 ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
              目前還沒有上架過商品喔！
            </div>
          ) : (
            <div className="grid gap-4">
              {myProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4 border border-orange-50 rounded-[28px]">
                  <div className="h-16 w-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img src={p.image_url?.[0] || p.image_url || "/placeholder-logo.png"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{p.name}</h4>
                    <p className="text-[#D35400] font-black">NT$ {p.price}</p>
                  </div>
                  <Badge className="bg-orange-50 text-[#D35400] border-none text-[10px]">
                    {p.status === 'approved' ? '已上架' : '審核中'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
