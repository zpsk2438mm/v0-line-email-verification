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
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_approved: boolean;
  created_at: string;
  age_url?: any;
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
  const { isAuthenticated, login } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    async function fetchAllApprovedProducts() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_approved", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("載入商品失敗:", error);
          return;
        }

        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (err) {
        console.error("未預期的錯誤:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllApprovedProducts();
  }, [isAuthenticated]);

  useEffect(() => {
    let result = products;
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
    let raw = product.age_url || product.image_url || product.images;
    if (!raw) return "";
    let urlString = "";
    if (Array.isArray(raw)) {
      urlString = raw[0] || "";
    } else if (typeof raw === "string") {
      if (raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          urlString = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) { urlString = raw; }
      } else { urlString = raw; }
    } else { urlString = String(raw); }

    let clean = urlString.trim().replace(/^\[['"]?/, "").replace(/['"]?\]$/, "").replace(/\\/g, "").replace(/^['"]/, "").replace(/['"]$/, "").trim();
    if (clean.startsWith("http")) return clean;
    const cleanPath = clean.replace(/^\//, "");
    return cleanPath.startsWith("product-images/") 
      ? `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${cleanPath}`
      : `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F9F8F6] flex flex-col justify-between pb-12">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D95300]">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">南台校園市集</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-xl bg-white overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-tr from-[#D95300] to-[#FF8C00] py-8 px-6 text-center text-white space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-yellow-300 animate-pulse" />
              <h2 className="text-xl font-extrabold tracking-wide">南台人限定二手市集</h2>
              <p className="text-xs text-orange-50">專屬於南台科技大學的安全校園交易平台</p>
            </div>
            <CardContent className="pt-8 pb-8 text-center space-y-6 px-6">
              <Button onClick={() => login?.()} className="w-full bg-[#D95300] hover:bg-[#B84600] text-white font-bold py-6 rounded-xl shadow-lg transition-all text-sm">
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
    <main className="min-h-screen bg-[#F9F8F6] pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D95300] shadow-md">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">市集首頁</h1>
      </header>

      {/* 頂部橘色橫幅 */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="relative bg-gradient-to-r from-[#FF8C00] to-[#D95300] rounded-2xl p-5 text-white shadow-lg overflow-hidden">
          <div className="space-y-1 relative z-10">
            <span className="bg-white/20 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">✨ 南台科技大學專屬</span>
            <h2 className="text-xl font-black tracking-wide pt-1">屬於南台人的二手淘寶地</h2>
            <p className="text-xs text-orange-50">省錢、環保、校內面交！快來尋寶吧 🎒</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 pt-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="搜尋商品..."
            className="pl-10 pr-4 py-5 bg-white border-slate-200/80 rounded-xl focus-visible:ring-[#D95300] shadow-sm text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 分類按鈕 - 選中時變橘色 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`rounded-full shrink-0 h-9 text-xs px-4 font-medium transition-all flex items-center ${
                selectedCategory === cat.id ? "bg-[#D95300] text-white shadow-md" : "bg-white text-slate-600 border hover:bg-slate-100"
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />熱門推薦
          </h3>
          <span className="text-xs text-slate-400">共 {filteredProducts.length} 件</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <Link 
              key={product.id} 
              href={`/products/${product.id}`} 
              className="block group active:scale-[0.98] transition-transform"
            >
              <Card className="h-full overflow-hidden bg-white border-none shadow-sm rounded-2xl flex flex-col group-hover:shadow-md transition-all">
                <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src={getCleanImageUrl(product) || "/placeholder.png"} 
                    alt={product.name} 
                    className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                  />
                  {/* 商品卡片左上角標籤改為橘色調 */}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="secondary" className="text-[9px] bg-[#FFF5EE] text-[#D95300] px-2 py-0.5 rounded-md font-bold shadow-sm border-none">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-[#D95300] transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {product.description || "南台二手優質商品"}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {/* 價格顏色改為主題橘色 */}
                    <p className="text-base font-extrabold text-[#D95300]">
                      NT$ {product.price.toLocaleString()}
                    </p>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t pt-2 border-dashed border-slate-100">
                      <span className="flex items-center gap-0.5 font-medium">
                        <Calendar className="h-3 w-3" /> {formatDate(product.created_at)}
                      </span>
                      <span className="text-[#D95300] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        GO →
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
