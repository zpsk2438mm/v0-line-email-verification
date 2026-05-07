"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock } from "lucide-react"; // 保持你原本的圖示
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  image_url: any;
}

export default function ProfilePage() {
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 自動登入邏輯 (保持不變)
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  useEffect(() => {
    if (!isAuthenticated || !lineUserId) return;
    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, is_approved, image_url")
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

  // 【修正】強力圖片解析：移除資料庫字串可能包含的 [ ] " ' \
  const getCleanImageUrl = (img: any) => {
    if (!img) return "/placeholder.png"; // 保持原有的預設圖
    let url = Array.isArray(img) ? img[0] : String(img).replace(/[\[\]"'\\]/g, "").trim();
    if (url.startsWith("http")) return url;
    // 補上 Supabase 的公開路徑 Bucket 名稱
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${url.replace(/^\//, "")}`;
  };

  if (liffLoading || !isAuthenticated) {
    return <div className="h-screen flex items-center justify-center font-bold">載入中...</div>;
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
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {/* 【修正】加上 referrerPolicy 以解決頭像不顯示 */}
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="LINE" 
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xl truncate">{userProfile?.displayName || "南台用戶"}</h2>
                <p className="text-xs text-blue-100 opacity-80 truncate">{userProfile?.email || "4B290004@STUST.EDU.TW"}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 我刊登的商品 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /> 我刊登的商品</h3>
            <Link href="/upload"><Button size="sm" variant="outline">+ 上架</Button></Link>
          </div>
          <div className="grid gap-3">
            {isLoadingProducts ? <Skeleton className="h-20 w-full" /> : myProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white transition-all">
                <div className="h-12 w-12 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  {/* 【修正】商品圖片顯示邏飾 */}
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
                {/* 保持你原本的 Badge 樣式與顏色 */}
                {p.is_approved ? (
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />已上架</Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px]"><Clock className="h-3 w-3 mr-1" />審核中</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
