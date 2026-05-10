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
  Loader2
} from "lucide-react";

// --- 資料結構定義 ---
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  status: string;
  created_at: string;
  image_url?: any;
  images?: any;
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

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  tools_stationery: "文具/專業工具",
  dorm_supplies: "租屋收納/雜貨",
  hobbies: "遊戲/娛樂",
  cosmetics: "化妝品/美妝",
  food: "食物/零食",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

export default function ExploreProductsPage() {
  const { isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // --- 抓取商品邏輯：只顯示「已上架」的商品 ---
  useEffect(() => {
    if (liffLoading) return;
    if (!isAuthenticated) {
      setFetching(false);
      return;
    }

    async function fetchAllApprovedProducts() {
      try {
        setFetching(true);
        // ✨ 修改重點：加上了 .eq("status", "已上架") 
        // 確保只有管理員審核過的商品才會出現在這裡
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "已上架") 
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (err) {
        console.error("載入商品失敗:", err);
      } finally {
        setFetching(false);
      }
    }

    fetchAllApprovedProducts();
  }, [isAuthenticated, liffLoading]);

  // --- 搜尋與分類邏輯 ---
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

  // --- 圖片網址工具 ---
  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "/placeholder-logo.png";
    try {
      let urlString = Array.isArray(raw) ? raw[0] : String(raw);
      let clean = urlString.replace(/[\[\]"']/g, "").trim();
      if (clean.startsWith("http")) return clean;
      return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
    } catch (e) {
      return "/placeholder-logo.png";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  };

  if (liffLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  }

  // --- 未登入介面 ---
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between pb-12">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400]">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">南台校園市集</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-xl bg-white overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-tr from-[#D35400] to-[#E67E22] py-8 px-6 text-center text-white space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-yellow-300 animate-pulse" />
              <h2 className="text-xl font-extrabold tracking-wide">南台人限定二手市集</h2>
              <p className="text-xs text-orange-50">專屬於南台科技大學的安全校園交易平台</p>
            </div>
            <CardContent className="pt-8 pb-8 text-center space-y-6 px-6">
              <Button onClick={() => login?.()} className="w-full bg-[#D35400] hover:bg-[#E67E22] text-white font-bold py-6 rounded-xl shadow-lg transition-all text-sm">
                <LogIn className="h-5 w-5 mr-2" />
                使用 LINE 安全快速登入
              </Button>
            </CardContent>
          </Card>
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

      {/* 搜尋與分類 */}
      <div className="mx-auto max-w-lg px-4 pt-5 space-y-4">
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

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`rounded-full shrink-0 h-9 text-xs px-4 font-medium transition-all ${
                selectedCategory === cat.id ? "bg-[#D35400] text-white shadow-md" : "bg-white text-slate-600 border"
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Flame className="h-4 w-4 text-[#D35400] fill-[#D35400]" />推薦商品
          </h3>
          <span className="text-xs text-slate-400">共 {filteredProducts.length} 件</span>
        </div>

        {fetching ? (
          <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-orange-200" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Link 
                key={product.id} 
                href={`/products/${product.id}`} 
                className="block group active:scale-[0.97] transition-all duration-200"
              >
                <Card className="h-full overflow-hidden bg-white border-none shadow-sm rounded-2xl flex flex-col hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={getCleanImageUrl(product)} 
                      alt={product.name} 
                      className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                      onError={(e) => e.currentTarget.src = "/placeholder-logo.png"}
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-[9px] bg-white/90 backdrop-blur-md text-[#D35400] font-bold border-none">
                        {CATEGORY_LABELS[product.category] || "其他"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-[#D35400]">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {product.description || "校園二手好物"}
                      </p>
                    </div>

                    <div className="mt-3">
                      <p className="text-base font-extrabold text-[#D35400]">
                        NT$ {product.price?.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" /> {formatDate(product.created_at)}
                        </span>
                      </div>
                    </div>
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
