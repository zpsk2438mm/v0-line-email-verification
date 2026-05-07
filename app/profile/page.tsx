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
  Mail
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
  const { lineUserId, userProfile, userEmail, isAuthenticated, login } = useLiff();
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
      if (lineUserId === null && !isAuthenticated) setIsLoadingProducts(false);
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

  // --- 修改重點：未登入驗證畫面 ---
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 border-none shadow-xl rounded-3xl bg-white">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-[#D95300]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-800">請先登入</h2>
            <p className="text-sm text-gray-500">登入後即可管理您的二手商品</p>
          </div>
          {/* 按鈕改為橘色 */}
          <Button 
            onClick={() => login?.()} 
            className="w-full h-14 text-lg font-bold rounded-2xl bg-[#D95300] hover:bg-[#B84600] text-white shadow-lg shadow-orange-100 transition-all active:scale-[0.98]"
          >
            使用 LINE 登入
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F8F6] pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊區塊 - 漸層改為橘色 */}
        <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-[#D95300] to-[#FF8C42] text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="LINE Profile" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xl truncate">
                  {userProfile?.displayName || "已驗證南台用戶"}
                </h2>
                <div className="flex items-center gap-1 text-orange-50 opacity-90 truncate">
                  <Mail className="h-3 w-3" />
                  <p className="text-xs">{userEmail || "4b290005@stust.edu.tw"}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 管理員入口 */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-[#404040] hover:bg-black text-white font-bold py-6 rounded-2xl mb-4 shadow-lg">
              <ShieldCheck className="mr-2" /> 進入管理後台
            </Button>
          </Link>
        )}

        {/* 商品清單 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <h3 className="font-bold flex items-center gap-1.5 text-gray-800">
              <Package className="h-4 w-4 text-[#D95300]" />
              我刊登的商品 ({myProducts.length})
            </h3>
            <Link href="/upload">
              <Button size="sm" variant="outline" className="border-[#D95300] text-[#D95300] hover:bg-orange-50 rounded-lg">
                + 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full rounded-xl" /></div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs font-medium">目前沒有商品，快去上架吧！</div>
          ) : (
            <div className="grid gap-3">
              {myProducts.map((product) => {
                const isApproved = product.is_approved === true || String(product.is_approved) === "true";
                return (
                  <div key={product.id} className="flex items-center gap-3 p-3 border rounded-xl border-gray-50 hover:bg-orange-50/30 transition-all">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                      <img 
                        src={getProductImage(product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 truncate">{product.name}</h4>
                      <p className="text-xs font-black text-[#D95300] mt-1">NT$ {product.price.toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {isApproved ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-100 rounded-lg">
                          已上架
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-orange-600 bg-orange-50 border-orange-100 rounded-lg">
                          審核中
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
