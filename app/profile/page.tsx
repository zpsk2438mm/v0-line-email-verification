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
  Mail,
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

// 🔒 統一管理員白名單
const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea" // 已同步你的 ID
];

export default function ProfilePage() {
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. 嚴謹的權限判斷：當 lineUserId 改變時重新檢查
  useEffect(() => {
    if (lineUserId) {
      const isMatched = ADMIN_LINE_IDS.includes(lineUserId);
      setIsAdmin(isMatched);
      console.log("權限檢查:", lineUserId, "是否管理員:", isMatched);
    }
  }, [lineUserId]);

  // 2. 抓取個人刊登商品
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
        console.error("讀取商品失敗:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  // 解析商品圖片函式
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
        <header className="flex items-center gap-3 mb-6">
           <Navigation />
           <Skeleton className="h-6 w-24" />
        </header>
        <Skeleton className="h-32 w-full max-w-md mx-auto rounded-2xl" />
        <div className="mt-4 space-y-3 max-w-md mx-auto">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 bg-white border-none shadow-xl rounded-3xl">
          <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="font-bold text-xl text-slate-800">尚未登入</h2>
            <p className="text-sm text-slate-500">登入後即可管理您的刊登商品</p>
          </div>
          <Button onClick={() => login?.()} className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl py-6">
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
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊區塊 */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
            <div className="flex items-center gap-4">
              <div className="h-18 w-18 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.src = "")}
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xl truncate mb-1">
                  {userProfile?.displayName || "已驗證用戶"}
                </h2>
                {/* 📧 顯示 LINE 信箱 */}
                <div className="flex items-center gap-1.5 text-blue-100 opacity-90">
                  <Mail className="h-3 w-3" />
                  <p className="text-xs truncate font-medium">
                    {userProfile?.email || "未提供信箱資訊"}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 👑 管理員入口 (僅白名單可見) */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-7 rounded-2xl mb-2 shadow-lg shadow-amber-100 border-b-4 border-amber-700 active:border-b-0 transition-all">
              <ShieldCheck className="mr-2 h-5 w-5" /> 進入管理審核後台
            </Button>
          </Link>
        )}

        {/* 商品管理列表 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              <Package className="h-4 w-4 text-blue-600" />
              我的刊登清單 ({myProducts.length})
            </h3>
            <Link href="/upload">
              <Button size="sm" variant="outline" className="rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50">
                + 我要上架
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
              <Package className="h-10 w-10 text-slate-100 mx-auto mb-3" />
              <p className="text-slate-400 text-xs">目前還沒有刊登任何商品喔</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {myProducts.map((product) => {
                const isApproved = product.is_approved === true || String(product.is_approved) === "true";
                const displayImg = getProductImage(product.image_url);

                return (
                  <div key={product.id} className="flex items-center gap-3 p-3 border rounded-xl border-slate-50 hover:bg-slate-50 transition-all group">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                      <img 
                        src={displayImg} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                      <p className="text-xs font-black text-rose-500 mt-1">NT$ {product.price.toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {isApproved ? (
                        <Badge variant="outline" className="text-[10px] py-1 text-emerald-600 bg-emerald-50 border-emerald-100 font-bold">
                          <CheckCircle className="h-3 w-3 mr-1" /> 已上架
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-1 text-amber-600 bg-amber-50 border-amber-100 font-bold">
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

        {/* 底部 ID 資訊 (除錯用，完成後可移除) */}
        <p className="text-[9px] text-center text-slate-300 font-mono pt-4">
          Device ID: {lineUserId}
        </p>
      </div>
    </main>
  );
}
