"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  created_at: string;
  image_url: string | string[] | null; // 👈 這裡調整為相容兩種格式
}

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df"];

export default function ProfilePage() {
  const { lineUserId, userEmail, isAuthenticated, login, isLoading: liffLoading } = useLiff();
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

  // 🖼️ 核心解析函式：處理資料庫中各種奇怪的圖片格式
  const getProductImage = (imageUrl: any): string => {
    const fallback = "/placeholder-logo.png"; // 👈 確保 public/ 有這張圖
    if (!imageUrl) return fallback;

    try {
      // 1. 如果已經是陣列，直接回傳第一項
      if (Array.isArray(imageUrl)) return imageUrl[0] || fallback;

      // 2. 如果是字串但包含 "["，嘗試解析 JSON (處理 ["http..."] 格式)
      if (typeof imageUrl === "string" && imageUrl.startsWith("[")) {
        const parsed = JSON.parse(imageUrl);
        return Array.isArray(parsed) ? parsed[0] : fallback;
      }

      // 3. 一般字串直接回傳
      return typeof imageUrl === "string" ? imageUrl : fallback;
    } catch (e) {
      return fallback;
    }
  };

  if (liffLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <Skeleton className="h-32 w-full max-w-md mx-auto rounded-2xl" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 text-center space-y-4">
          <User className="h-12 w-12 mx-auto text-slate-300" />
          <h2 className="font-bold">請先登入</h2>
          <Button onClick={() => login?.()} className="w-full">使用 LINE 登入</Button>
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
        {/* 用戶資訊 */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-lg truncate">已驗證南台用戶</h2>
                <p className="text-xs text-blue-100 truncate">{userEmail}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 管理員入口 */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 rounded-2xl mb-4">
              <ShieldCheck className="mr-2" /> 進入管理後台
            </Button>
          </Link>
        )}

        {/* 商品清單 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-bold flex items-center gap-1.5 text-slate-800">
              <Package className="h-4 w-4 text-blue-600" />
              我刊登的商品 ({myProducts.length})
            </h3>
            <Link href="/"><Button size="sm" variant="outline">+ 我要上架</Button></Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full rounded-xl" /></div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">目前沒有商品</div>
          ) : (
            <div className="grid gap-3">
              {myProducts.map((product) => {
                const isApproved = product.is_approved === true || String(product.is_approved).toLowerCase() === "true";
                const displayImg = getProductImage(product.image_url);

                return (
                  <div key={product.id} className="flex items-center gap-3 p-3 border rounded-xl border-slate-100 hover:bg-slate-50 transition-all">
                    {/* 🖼️ 圖片顯示區域 */}
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img 
                        src={displayImg} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                      <p className="text-xs font-black text-rose-500 mt-1">NT$ {product.price.toLocaleString()}</p>
                    </div>

                    <div className="shrink-0">
                      {isApproved ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-100">
                          <CheckCircle className="h-3 w-3 mr-1" /> 已上架
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 border-amber-100">
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
