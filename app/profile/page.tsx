"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock, ShieldCheck, Mail, Plus } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  created_at: string;
  image_url: string | string[] | null;
}

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

export default function ProfilePage() {
  const { lineUserId, userProfile, userEmail, isAuthenticated, login } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const isAdmin = lineUserId && ADMIN_LINE_IDS.includes(lineUserId);

  useEffect(() => {
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
        console.error("讀取失敗:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  const getProductImage = (imageUrl: any): string => {
    const fallback = "/placeholder-logo.png";
    if (!imageUrl) return fallback;
    try {
      if (Array.isArray(imageUrl)) return imageUrl[0] || fallback;
      return typeof imageUrl === "string" ? imageUrl : fallback;
    } catch (e) { return fallback; }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 text-center space-y-4 shadow-xl rounded-3xl">
          <User className="h-12 w-12 mx-auto text-slate-300" />
          <h2 className="font-bold text-xl">請先登入</h2>
          <p className="text-sm text-slate-500">驗證南台信箱後即可管理您的商品</p>
          <Button onClick={() => login?.()} className="w-full bg-blue-600 h-12 rounded-xl font-bold">使用 LINE 登入</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊卡片 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-8">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><User size={32} /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">{userProfile?.displayName || "南台用戶"}</h2>
                <div className="flex items-center gap-1 text-blue-100 opacity-90 mt-1">
                  <Mail className="h-3 w-3" />
                  <p className="text-xs font-medium truncate">{userEmail || "驗證收件中..."}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 管理員按鈕 */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-7 rounded-2xl mb-2 shadow-lg shadow-amber-100">
              <ShieldCheck className="mr-2" /> 進入管理後台
            </Button>
          </Link>
        )}

        {/* 商品列表 */}
        <Card className="border-none shadow-sm rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              <Package className="h-5 w-5 text-blue-600" />
              我的商品 ({myProducts.length})
            </h3>
            {/* 修正點：href 指向首頁 */}
            <Link href="/">
              <Button size="sm" variant="outline" className="rounded-xl border-blue-100 text-blue-600 font-bold hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-1" /> 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-3"><Skeleton className="h-24 w-full rounded-2xl" /></div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-medium">目前還沒有刊登任何商品喔</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {myProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 border rounded-2xl border-slate-50 hover:bg-slate-50 transition-all">
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img src={getProductImage(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                    <p className="text-sm font-black text-rose-500">NT$ {product.price.toLocaleString()}</p>
                  </div>
                  <div className="shrink-0">
                    {product.is_approved ? (
                      <Badge className="rounded-lg text-[10px] bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 shadow-none">已上架</Badge>
                    ) : (
                      <Badge className="rounded-lg text-[10px] bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-50 shadow-none">審核中</Badge>
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
