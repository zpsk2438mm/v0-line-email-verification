"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";

export default function ExploreProductsPage() {
  const { isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 【新增】強制登入邏輯
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchProducts() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_approved", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setProducts(data || []);
        setFilteredProducts(data || []);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [isAuthenticated]);

  // 【修正】圖片解析邏輯，確保顯示你的商品圖
  const getCleanImageUrl = (img: any) => {
    if (!img) return "/placeholder.png";
    let url = Array.isArray(img) ? img[0] : String(img).replace(/[\[\]"'\\]/g, "").trim();
    if (url.startsWith("http")) return url;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${url.replace(/^\//, "")}`;
  };

  if (liffLoading || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">市集首頁</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜尋商品..." className="pl-10 py-5 bg-white rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden border-none shadow-sm rounded-2xl">
              <div className="aspect-square bg-slate-100">
                <img src={getCleanImageUrl(product.image_url)} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <h4 className="font-bold text-sm truncate">{product.name}</h4>
                <p className="text-rose-500 font-extrabold text-lg">NT$ {product.price}</p>
                <Link href={`/products/${product.id}`} className="block text-center text-xs text-blue-600 mt-2 border-t pt-2">查看詳情</Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
