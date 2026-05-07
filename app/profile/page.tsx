"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock } from "lucide-react"; 
import Link from "next/link";

export default function ProfilePage() {
  // 從 liff-provider 取得 userProfile，裡面包含你在側邊欄看到的信箱資料
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 登入狀態檢查
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  // 2. 抓取該使用者的商品
  useEffect(() => {
    if (!isAuthenticated || !lineUserId) return;
    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMyProducts(data || []);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  const getCleanImageUrl = (img: any) => {
    if (!img) return "/placeholder.png"; 
    let url = Array.isArray(img) ? img[0] : String(img).replace(/[\[\]"'\\]/g, "").trim();
    if (url.startsWith("http")) return url;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${url.replace(/^\//, "")}`;
  };

  // 載入中畫面
  if (liffLoading) {
    return <div className="h-screen flex items-center justify-center font-bold text-slate-400">同步中...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 使用者資訊卡片：同步手機側邊欄的真實信箱 */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {/* 顯示 LINE 授權頭像 */}
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Profile"
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer" 
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User className="h-8 w-8 text-white/70" />
                )}
              </div>
              
              <div className="min-w-0">
                {/* 顯示 LINE 暱稱 */}
                <h2 className="font-black text-xl truncate">
                  {userProfile?.displayName || "已驗證用戶"}
                </h2>
                
                {/* 核心修正：將原本寫死的學號信箱改為抓取真實 userProfile 資訊 */}
                <p className="text-xs text-blue-100 opacity-80 truncate">
                  {userProfile?.email || "載入信箱資料中..."}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品列表部分 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" /> 我刊登的商品
            </h3>
            <Link href="/">
              <Button size="sm" variant="outline">+ 上架</Button>
            </Link>
          </div>
          
          <div className="grid gap-3">
            {isLoadingProducts ? (
              <Skeleton className="h-20 w-full" />
            ) : myProducts.length > 0 ? (
              myProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white">
                  <div className="h-12 w-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                    <img 
                      src={getCleanImageUrl(p.image_url)} 
                      className="w-full h-full object-cover" 
                      onError={(e) => e.currentTarget.src="/placeholder.png"} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate text-slate-700">{p.name}</h4>
                    <p className="text-rose-500 font-bold text-xs">NT$ {p.price}</p>
                  </div>
                  {p.is_approved ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" />已上架
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />審核中
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm">目前尚無商品</div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
