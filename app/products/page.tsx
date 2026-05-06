"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  ShoppingBag,
  Tag,
  Calendar,
  AlertCircle,
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
  status?: string;
  created_at: string;
  image_url?: any;
  images?: any;
}

const CATEGORIES = [
  { id: "all", label: "✨ 全部" },
  { id: "electronics", label: "📱 電子產品" },
  { id: "books", label: "📚 書籍教材" },
  { id: "clothing", label: "👕 服飾配件" },
  { id: "furniture", label: "🛋️ 家具家電" },
  { id: "sports", label: "🏀 運動用品" },
  { id: "other", label: "🔍 其他" },
];

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
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
  
  // 搜尋與篩選狀態
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
        // 撈取審核通過的公開商品
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or("status.eq.approved,status.is.null")
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

  // 即時篩選
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

  // 💡 終極防污染圖片路徑解析器
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
    });
  };

  // 🔒 守門員畫面：未登入時卡片 (高質感設計)
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-between pb-12">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">南台校園市集</h1>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-xl bg-white overflow-hidden rounded-2xl">
            {/* 卡片上方漸層 Banner */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 py-8 px-6 text-center text-white space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-yellow-300 animate-pulse" />
              <h2 className="text-xl font-extrabold tracking-wide">
                南台人限定二手市集
              </h2>
              <p className="text-xs text-blue-100">
                專屬於南台科技大學的安全校園交易平台
              </p>
            </div>

            <CardContent className="pt-8 pb-8 text-center space-y-6 px-6">
              <div className="space-y-2 text-slate-600 text-sm">
                <p className="font-medium text-slate-800">🔒 登入後即可解鎖：</p>
                <div className="flex flex-col gap-2 items-center text-xs mt-3">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">✓ 瀏覽所有同學上架之寶物</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">✓ 免費刊登自己不用的二手品</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">✓ 校內面交、安全又省運費</span>
                </div>
              </div>

              <Button 
                onClick={() => login?.()} 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-200 transition-all text-sm"
              >
                <LogIn className="h-5 w-5 mr-2" />
                使用 LINE 安全快速登入
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ✅ 已登入市集主畫面 (完美復刻範例之高質感版)
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">市集首頁</h1>
      </header>

      {/* 頂部精美 Banner */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-10">
            <ShoppingBag className="h-32 w-32" />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="bg-white/20 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              ✨ 南台科技大學專屬
            </span>
            <h2 className="text-xl font-black tracking-wide pt-1">
              屬於南台人的二手淘寶地
            </h2>
            <p className="text-xs text-blue-100">
              省錢、環保、校內面交！快來尋寶吧 🎒
            </p>
          </div>
        </div>
      </div>

      {/* 搜尋與篩選列 */}
      <div className="mx-auto max-w-lg px-4 pt-5 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="輸入商品名稱、課本、電子產品..."
            className="pl-10 pr-4 py-5 bg-white border-slate-200/80 rounded-xl focus-visible:ring-blue-500 shadow-sm text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 橫向滾動分類標籤 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`rounded-full shrink-0 h-9 text-xs px-4 font-medium transition-all flex items-center ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100 scale-102"
                  : "bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-100"
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 商品格柵 */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
            熱門推薦商品
          </h3>
          <span className="text-xs text-slate-400">共 {filteredProducts.length} 件</span>
        </div>

        {isLoading ? (
          /* 載入中骨架 */
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden border-none shadow-sm rounded-xl">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* 無商品狀態 */
          <Card className="py-16 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl">
            <CardContent className="space-y-3">
              <Package className="h-14 w-14 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-500">
                目前還沒有這類商品喔
              </p>
              <p className="text-xs text-slate-400">
                歡迎你成為第一個上架此類商品的南台之星！
              </p>
            </CardContent>
          </Card>
        ) : (
          /* 商品雙欄高質感卡片 */
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const imageUrl = getCleanImageUrl(product);

              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden bg-white border-none shadow-sm rounded-2xl flex flex-col justify-between group hover:shadow-md transition-all duration-300"
                >
                  {/* 圖片容器 */}
                  <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-100"><svg class="h-8 w-8 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-100">
                        <Package className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                    {/* 分類標籤 Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <Badge variant="secondary" className="text-[9px] bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md font-bold text-slate-700 shadow-sm border-none">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </Badge>
                    </div>
                  </div>

                  {/* 資訊區域 */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <p className="text-base font-extrabold text-rose-500">
                        NT$ {product.price.toLocaleString()}
                      </p>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t pt-2 border-dashed border-slate-100">
                        <span className="flex items-center gap-0.5 font-medium">
                          <Calendar className="h-3 w-3 text-slate-300" />
                          {formatDate(product.created_at)}
                        </span>
                        <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                          查看 🔍
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
