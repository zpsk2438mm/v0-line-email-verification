"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Calendar,
  LogIn,
  Flame,
  Sparkles,
  Loader2,
  Mail
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  status: string;
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
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // --- 抓取商品邏輯 ---
  useEffect(() => {
    async function init() {
      // 1. 先從 Supabase 檢查有沒有本地快取的 Session
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. 獲取商品（即便沒登入也可以先抓，或是等登入後重新整理）
      try {
        setFetching(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved") 
          .order("created_at", { ascending: false });

        if (!error) {
          setProducts(data || []);
          setFilteredProducts(data || []);
        }
      } catch (err) {
        console.error("載入失敗:", err);
      } finally {
        setFetching(false);
      }
    }
    init();
  }, []);

  // --- 分類與搜尋篩選 ---
  useEffect(() => {
    let result = products || [];
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }
    setFilteredProducts(result);
  }, [searchQuery, selectedCategory, products]);

  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url;
    if (!raw) return "/placeholder-logo.png";
    try {
      let urlString = Array.isArray(raw) ? raw[0] : String(raw);
      let clean = urlString.replace(/[\[\]"']/g, "").trim();
      if (clean.startsWith("http")) return clean;
      return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
    } catch (e) { return "/placeholder-logo.png"; }
  };

  // 載入中（只在最初幾秒顯示）
  if (liffLoading && fetching && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-8 w-8 text-[#D35400]" />
      </div>
    );
  }

  // 未登入畫面
  if (!isAuthenticated && !liffLoading) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6">
          <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-[#D35400]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">歡迎回到南臺市集</h2>
          <p className="text-sm text-slate-500">為了安全考量，請先完成登入。我們會記住您的登入狀態。</p>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] py-6 rounded-xl font-bold">
            立即登入
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">市集首頁</h1>
      </header>

      {/* 搜尋區 */}
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="搜尋商品..."
            className="pl-10 pr-4 py-5 bg-white border-slate-200 rounded-xl focus-visible:ring-[#D35400]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`rounded-full shrink-0 h-9 text-xs px-4 font-medium transition-all ${
                selectedCategory === cat.id ? "bg-[#D35400] text-white" : "bg-white text-slate-600 border"
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表區 */}
      <div className="mx-auto max-w-lg px-4 mt-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Flame className="h-4 w-4 text-[#D35400]" /> 推薦商品
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">COUNT: {filteredProducts.length}</span>
        </div>

        {fetching ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-slate-200/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="block active:scale-95 transition-transform">
                <Card className="h-full border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="aspect-square relative bg-slate-100">
                    <img src={getCleanImageUrl(product)} alt="" className="object-cover h-full w-full" />
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{product.name}</h4>
                    <p className="text-base font-black text-[#D35400] mt-1">NT$ {product.price}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
