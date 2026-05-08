"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation"; // 👈 確保引入 Navigation
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  CheckCircle,
  Clock,
  Trash2,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: any;
  images?: any;
  is_approved: boolean; 
  created_at: string;
}

export default function MyListingsPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 獲取使用者自己上架的商品
  useEffect(() => {
    if (liffLoading) return;

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("讀取商品失敗:", error);
          return;
        }

        const userProducts = lineUserId 
          ? (data || []).filter((p: any) => p.line_user_id === lineUserId || p.user_id === lineUserId)
          : (data || []);

        setMyProducts(userProducts.length > 0 ? userProducts : (data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchMyProducts();
  }, [liffLoading, lineUserId]);

  const handleDelete = async (productId: string) => {
    if (!confirm("確定要刪除這項商品嗎？此動作無法復原。")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) {
        alert("刪除失敗：" + error.message);
        return;
      }

      setMyProducts(myProducts.filter((p) => p.id !== productId));
      alert("商品已成功刪除！");
    } catch (err) {
      console.error(err);
    }
  };

  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "";
    let urlString = Array.isArray(raw) ? raw[0] : String(raw);
    let clean = urlString.trim().replace(/[\[\]"']/g, "");
    if (clean.startsWith("http")) return clean;
    const cleanPath = clean.replace(/^\//, "");
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace("product-images/", "")}`;
  };

  // --- 修改標頭區塊：加入 Navigation ---
  const Header = () => (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
      <Navigation /> {/* 👈 三條線漢堡選單放在這裡 */}
      <Link href="/products">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="h-6 w-[1px] bg-slate-200 mx-1" /> {/* 分隔線，讓視覺更整齊 */}
      <h1 className="text-lg font-bold text-slate-800">我的商品</h1>
    </header>
  );

  if (liffLoading || isLoadingProducts) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <Header />

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {myProducts.length === 0 ? (
          <div className="text-center py-20 space-y-3 bg-white rounded-2xl p-6 shadow-sm">
            <Package className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-400">目前沒有刊登中的商品喔</p>
            <Link href="/">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
                前往上架商品
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myProducts.map((product) => {
              const isApproved = product.is_approved === true || String(product.is_approved).toLowerCase() === "true";
              const imageUrl = getCleanImageUrl(product);

              return (
                <Card key={product.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                  <CardContent className="p-4 flex gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-slate-800 truncate pr-2">{product.name}</h3>
                          {isApproved ? (
                            <Badge className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-200">
                              <CheckCircle className="h-3 w-3 mr-1" /> 已上架
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] font-bold text-amber-600 bg-amber-50 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" /> 審核中
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-black text-blue-600 mt-1">NT$ {product.price.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(product.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="flex justify-start mt-2 border-t pt-2 border-dashed border-slate-100">
                        <button onClick={() => handleDelete(product.id)} className="text-xs text-red-500 font-bold flex items-center gap-1">
                          <Trash2 className="h-3.5 w-3.5" /> 刪除商品
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
