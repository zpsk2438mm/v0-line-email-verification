"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Package,
  CheckCircle,
  Clock,
  ShieldCheck,
  Mail, // 新增圖示
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  created_at: string;
  image_url: string | string[] | null;
}

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df"];

export default function ProfilePage() {
  // 從 useLiff 取得 userProfile (包含 pictureUrl, displayName, email)
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (lineUserId && ADMIN_LINE_IDS.includes(lineUserId)) {
      setIsAdmin(true);
    }
  }, [lineUserId]);

  useEffect(() => {
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
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
      if (typeof imageUrl === "string" && imageUrl.startsWith("[")) {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) ? parsed[0] : fallback;
      }
      return typeof imageUrl === "string" ? imageUrl : fallback;
    } catch (e) {
      return fallback;
    }
  };

  if (liffLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 text-center space-y-4 shadow-md border-none rounded-2xl bg-white">
          <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-xl text-slate-800">尚未登入</h2>
            <p className="text-sm text-slate-500">請先登入以查看您的個人資料與商品</p>
          </div>
          <Button onClick={() => login?.()} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700">
            使用 LINE 登入
          </Button>
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
        {/* 用戶資訊區塊 */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
            <div className="flex items-center gap-4">
              {/* LINE 頭像顯示區域 */}
              <div className="h-20 w-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-lg">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="LINE Profile" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = ""; 
                    }}
                  />
                ) : (
                  <User className="h-10 w-10 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-2xl truncate drop-shadow-sm">
                  {userProfile?.displayName || "已驗證用戶"}
                </h2>
                {/* 核心修正：顯示同步的學校信箱資料 */}
                <div className="flex items-center gap-1.5 mt-1 text-blue-100/90">
                  <Mail className="h-3 w-3 shrink-0" />
                  <p className="text-xs font-medium truncate">
                    {userProfile?.email || "載入信箱中..."}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 管理員入口 */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 rounded-2xl shadow-sm">
              <ShieldCheck className="mr-2" /> 進入管理後台
            </Button>
          </Link>
        )}

        {/* 商品清單 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              <Package className="h-5 w-5 text-blue-600" />
              我刊登的商品
              <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-600 border-none px-2">
                {myProducts.length}
              </Badge>
            </h3>
            {/* 補回「+ 上架」按鈕 */}
            <Link href="/upload">
              <Button size="sm" variant="outline" className="rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50">
                + 上架商品
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-slate-200" />
              </div>
              <p className="text-slate-400 text-sm">目前沒有刊登中的商品</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {myProducts.map((product) => {
                const isApproved = product.is_approved === true || String(product.is_approved) === "true";
                const displayImg = getProductImage(product.image_url);

                return (
                  <div key={product.id} className="flex items-center gap-3 p-3 border rounded-xl border-slate-100 hover:bg-slate-50 transition-all group">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img 
                        src={displayImg} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                      <p className="text-xs font-black text-rose-500 mt-1">NT$ {product.price.toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {isApproved ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-100 py-1">
                          <CheckCircle className="h-3 w-3 mr-1" /> 已上架
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 border-amber-100 py-1">
                          <Clock className="h-3 w-3 mr-1" /> 審核中
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
