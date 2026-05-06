"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
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

export default function MyProductsPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 獲取使用者自己上架的商品
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
          .select("id, name, price, description, category, image_url, images, is_approved, created_at")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("讀取商品失敗:", error);
          return;
        }
        setMyProducts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  // 刪除商品功能
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

  // 萬用圖片路徑解析函數
  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "";

    let urlString = "";

    if (Array.isArray(raw)) {
      urlString = raw[0] || "";
    } else if (typeof raw === "string") {
      if (raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            urlString = parsed[0] || "";
          } else {
            urlString = parsed;
          }
        } catch (e) {
          urlString = raw;
        }
      } else {
        urlString = raw;
      }
    } else {
      urlString = String(raw);
    }

    if (!urlString) return "";

    let clean = urlString
      .trim()
      .replace(/^\[['"]?/, "")
      .replace(/['"]?\]$/, "")
      .replace(/\\/g, "")
      .replace(/^['"]/, "")
      .replace(/['"]$/, "")
      .trim();

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    } else {
      const cleanPath = clean.replace(/^\//, "");
      if (cleanPath.startsWith("product-images/")) {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${cleanPath}`;
      } else {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
      }
    }
  };

  if (liffLoading || isLoadingProducts) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Link href="/profile">
            <ChevronLeft className="h-6 w-6 text-slate-600" />
          </Link>
          <h1 className="text-lg font-bold">我的商品</h1>
        </header>
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Link href="/profile">
          <ChevronLeft className="h-6 w-6 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">我的商品</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {myProducts.length === 0 ? (
          <div className="text-center py-20 space-y-3 bg-white rounded-2xl p-6 shadow-sm">
            <Package className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-400">目前沒有刊登中的商品喔</p>
            <Link href="/" className="inline-block pt-2">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6">
                前往上架商品
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myProducts.map((product) => {
              const isApproved =
                product.is_approved === true ||
                String(product.is_approved).toLowerCase() === "true";

              const imageUrl = getCleanImageUrl(product);

              return (
                <Card key={product.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                  <CardContent className="p-4 flex gap-4">
                    {/* 📷 修正後的商品圖片容器：完美鎖定 96x96 像素比例，並防止圖片變形 */}
                    <div className="relative h-24 w-24 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-100"><svg class="h-8 w-8 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <Package className="h-8 w-8 text-slate-300" />
                      )}
                    </div>

                    {/* 商品資訊與狀態 */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-slate-800 truncate pr-2">
                            {product.name}
                          </h3>
                          {isApproved ? (
                            <Badge className="text-[10px] font-bold border flex items-center gap-1 shadow-none text-emerald-600 bg-emerald-50 border-emerald-200 flex-shrink-0">
                              <CheckCircle className="h-3 w-3" />
                              已上架
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] font-bold border flex items-center gap-1 shadow-none text-blue-600 bg-blue-50 border-blue-200 flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              審核中
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-black text-blue-600 mt-1">
                          NT$ {product.price.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(product.created_at).toLocaleDateString()}
                        </p>
                        {product.description && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* 刪除按鈕 */}
                      <div className="flex justify-start mt-2 border-t pt-2 border-dashed border-slate-100">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          刪除商品
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
