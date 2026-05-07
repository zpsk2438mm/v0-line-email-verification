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
import { Search, ShoppingBag, Calendar, Flame, Sparkles } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_approved: boolean;
  created_at: string;
  image_url?: any;
}

const CATEGORIES = [
  { id: "all", label: "✨ 全部" },
  { id: "electronics", label: "📱 電子產品" },
  { id: "books", label: "📚 書籍教材" },
  { id: "tools_stationery", label: "✏️ 文具/專業工具" },
  { id: "dorm_supplies", label: "🏠 租屋收納/雜貨" },
  { id: "hobbies", label: "🎮 遊戲/娛樂" },
  { id: "cosmetics", label: "💄 化妝品/美妝" },
  { id: "food", label: "🍕 食物/零食" },
  { id: "clothing", label: "👕 服飾配件" },
  { id: "furniture", label: "🛋️ 家具家電" },
  { id: "sports", label: "🏀 運動用品" },
  { id: "other", label: "🔍 其他" },
];

export default function ExploreProductsPage() {
  const { isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 強制自動登入驗證
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
      } catch (err) {
        console.error("載入失敗:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [isAuthenticated]);

  useEffect(() => {
    let result = products;
    if (selectedCategory !== "all") result = result.filter(p => p.category === selectedCategory);
    if (searchQuery.trim()) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredProducts(result);
  }, [searchQuery, selectedCategory, products]);

  // 強力圖片解析邏輯
  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url;
    if (!raw) return "/placeholder-logo.png";
    let url = Array.isArray(raw) ? raw[0] : String(raw).replace(/[\[\]"'\\]/g, "").trim();
    if (url.startsWith("http")) return url;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${url.replace(/^\//, "")}`;
  };

  if (liffLoading || !isAuthenticated) {
    return <div className="h-screen flex items-center justify-center bg-slate-50">驗證中...</div>;
  }

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
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`rounded-full shrink-0 h-9 px-4 text-xs ${selectedCategory === cat.id ? "bg-blue-600 text-white" : "bg-white border"}`}>{cat.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden border-none shadow-sm rounded-2xl">
              <div className="aspect-square bg-slate-100">
                <img src={getCleanImageUrl(product)} className="h-full w-full object-cover" onError={(e) => e.currentTarget.src="/placeholder-logo.png"} />
              </div>
              <div className="p-3">
                <h4 className="font-bold text-sm truncate">{product.name}</h4>
                <p className="text-rose-500 font-extrabold">NT$ {product.price}</p>
                <Link href={`/products/${product.id}`} className="block text-center text-xs text-blue-600 mt-2 border-t pt-2">查看詳情</Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
