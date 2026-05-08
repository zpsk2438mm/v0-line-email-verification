"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Mail, Plus } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  created_at: string;
  image_url: any;
}

export default function ProfilePage() {
  const { lineUserId, userProfile, userEmail, isAuthenticated, login } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 抓取資料邏輯
  useEffect(() => {
    // 關鍵：在手機版 LIFF 載入較慢，必須明確等待 lineUserId
    if (!isAuthenticated || !lineUserId) {
      if (!isAuthenticated) setIsLoadingProducts(false);
      return;
    }

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, is_approved, created_at, image_url")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMyProducts(data || []);
      } catch (err) {
        console.error("Supabase 讀取失敗:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  // 2. 圖片解析函數
  const getProductImage = (url: any): string => {
    const fallback = "/placeholder-logo.png";
    if (!url) return fallback;
    try {
      if (Array.isArray(url)) return url[0] || fallback;
      if (typeof url === "string" && url.startsWith("[")) {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) ? parsed[0] : url;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <Card className="w-full max-w-sm p-8 space-y-6 shadow-xl rounded-3xl bg-white border-none">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-2xl text-slate-800">尚未登入</h2>
            <p className="text-slate-500 text-sm">請使用 LINE 登入以管理您的商品</p>
          </div>
          <Button onClick={() => login?.()} className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl font-bold text-lg text-white transition-all shadow-lg shadow-blue-100">使用 LINE 登入</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white/80 backdrop-blur-md px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-extrabold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-10 px-6">
            <div className="flex items-center gap-5 text-left">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/10 shrink-0 shadow-inner">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Profile" 
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><User size={32} /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate tracking-tight">{userProfile?.displayName || "南台用戶"}</h2>
                <div className="flex items-center gap-1.5 text-blue-100/80 mt-1">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <p className="text-xs font-semibold truncate uppercase">{userEmail || "個人檔案載入中"}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品列表區塊 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5 mb-5">
            <div className="flex flex-col">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                我刊登的商品
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Total {myProducts.length} Items</p>
            </div>
            <Link href="/">
              <Button size="sm" className="rounded-xl bg-blue-50 text-blue-600 font-black hover:bg-blue-100 border-none px-4 h-10 shadow-none">
                <Plus className="h-4 w-4 mr-1 stroke-[3px]" /> 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-50" />)}
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Package className="h-14 w-14 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">目前還沒有刊登任何商品</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-3.5 border border-slate-50 rounded-2xl bg-white hover:border-blue-100 transition-all shadow-sm">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-50 shadow-inner">
                    <img 
                      src={getProductImage(product.image_url)} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {(e.target as HTMLImageElement).src = "/placeholder-logo.png"}}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="font-bold text-sm text-slate-800 truncate mb-1">{product.name}</h4>
                    <p className="text-sm font-black text-rose-500">NT$ {product.price.toLocaleString()}</p>
                  </div>
                  <div className="shrink-0">
                    {product.is_approved ? (
                      <Badge className="rounded-lg text-[10px] py-1 bg-emerald-50 text-emerald-600 border-emerald-100 font-black shadow-none">已上架</Badge>
                    ) : (
                      <Badge className="rounded-lg text-[10px] py-1 bg-amber-50 text-amber-600 border-amber-100 font-black shadow-none">審核中</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
