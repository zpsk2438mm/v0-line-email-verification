"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Mail, Plus, Trash2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { lineUserId, userProfile, userEmail, isAuthenticated, login, isLiffInit } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 核心查詢邏輯：支援雙重識別 (line_user_id & verified_email)
  const fetchMyProducts = useCallback(async () => {
    // 只有在 LIFF 初始化完成且已驗證身分後才抓資料
    if (!isLiffInit || !isAuthenticated) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      
      // 從 localStorage 嘗試抓取快取數據 (選配：增加體驗流暢度)
      const cachedData = localStorage.getItem(`products_${lineUserId || userEmail}`);
      if (cachedData) setMyProducts(JSON.parse(cachedData));

      let query = supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url");

      if (lineUserId && userEmail) {
        query = query.or(`line_user_id.eq.${lineUserId},email.eq.${userEmail}`);
      } else if (userEmail) {
        query = query.eq("email", userEmail);
      } else {
        query = query.eq("line_user_id", lineUserId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && data) {
        setMyProducts(data);
        // 更新快取
        localStorage.setItem(`products_${lineUserId || userEmail}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error("讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isLiffInit, isAuthenticated, lineUserId, userEmail]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // 2. 處理圖片與刪除 (省略部分重複代碼以保持簡潔...)
  const getProductImage = (url: any) => { /* 同前... */ return url; };

  // 3. 渲染邏輯：如果 LIFF 還沒初始化完，顯示全螢幕骨架屏，避免閃爍強制登入
  if (!isLiffInit) {
    return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">載入中...</div>;
  }

  // 4. 未登入狀態：只有在確定沒登入時才顯示
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
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="m-auto h-10 w-10 mt-5" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">{userProfile?.displayName || userEmail?.split('@')[0]}</h2>
                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <p className="text-[10px] font-bold uppercase flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {userEmail}
                  </p>
                  <p className="text-[10px] font-bold opacity-60">ID: {lineUserId?.slice(0, 10)}...</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品清單部分 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between mb-5 border-b border-orange-50 pb-5">
            <h3 className="font-black text-lg flex items-center gap-2"><Package className="h-5 w-5 text-[#D35400]" /> 我的商品</h3>
            <Link href="/"><Button size="sm" className="rounded-xl bg-orange-50 text-[#D35400] font-black h-10 border-none"><Plus className="w-4 h-4 mr-1" />上架</Button></Link>
          </div>

          {isLoadingProducts && myProducts.length === 0 ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
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
                  <Badge className="bg-orange-50 text-[#D35400] border-none text-[10px]">{p.status === 'approved' ? '已上架' : '審核中'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
