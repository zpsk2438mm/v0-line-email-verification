"use client";

// app/profile/page.tsx 終極修復對齊版

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Mail, Plus, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Clock3 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { lineUserId, userProfile, userEmail, isAuthenticated, login, userName, isLiffInit } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 商品撈取邏輯 (🛠️ 改為跟 my-listings 一樣，用 line_user_id 撈取最精準)
  const fetchMyProducts = useCallback(async () => {
    // 🎯 這裡修正：只要 lineUserId 還沒抓到就先不執行，確保一定能對齊資料
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      const cacheKey = `products_${lineUserId}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) setMyProducts(JSON.parse(cachedData));

      // 🎯 核心修正：將原本的 .eq("verified_email", userEmail) 
      // 換成跟 my-listings 一模一樣的 .eq("line_user_id", lineUserId) 確保舊資料也能完美抓回
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url, verified_email, line_user_id")
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // 🛠️ 安全圖片解析防線：相容字串、陣列及 JSON 格式，確保絕不破圖
        const formattedData = data.map(item => {
          let displayImg = "/placeholder-logo.png";
          if (item.image_url) {
            if (Array.isArray(item.image_url) && item.image_url.length > 0) {
              displayImg = item.image_url[0];
            } else if (typeof item.image_url === 'string') {
              if (item.image_url.startsWith('[')) {
                try {
                  const arr = JSON.parse(item.image_url);
                  if (arr.length > 0) displayImg = arr[0];
                } catch(e) { displayImg = item.image_url; }
              } else {
                displayImg = item.image_url;
              }
            }
          }
          return { ...item, display_image: displayImg };
        });

        setMyProducts(formattedData);
        localStorage.setItem(cacheKey, JSON.stringify(formattedData));
      }
    } catch (err) {
      console.error("個人商品讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated, lineUserId]); // 🎯 依賴項精簡同步為 lineUserId

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // 2. 核心鎖定：同步 LINE 個人資料
  if (isAuthenticated && !userProfile && !lineUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
        <p className="text-gray-500 font-bold">正在同步您的 LINE 個人資料...</p>
      </div>
    );
  }

  // 3. 未登入狀態
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

  // 4. 最終畫面渲染
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 使用者資訊卡片 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-10 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/20 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
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
                    <img src={p.display_image} className="w-full h-full object-cover" alt={p.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{p.name}</h4>
                    <p className="text-[#D35400] font-black">NT$ {p.price}</p>
                  </div>
                  
                  {p.status === 'approved' ? (
                    <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 已上架
                    </Badge>
                  ) : p.status === 'rejected' ? (
                    <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> 已退回
                    </Badge>
                  ) : (
                    <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1">
                      <Clock3 className="h-3 w-3" /> 審核中
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
