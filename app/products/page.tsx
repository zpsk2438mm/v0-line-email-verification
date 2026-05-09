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

// ... (CATEGORIES 與 CATEGORY_LABELS 保持不變)

export default function ExploreProductsPage() {
  const { isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ... (useEffect 抓取資料邏輯保持不變)

  // 優化圖片網址處理，確保跳轉到詳情頁前能正確顯示縮圖
  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "/placeholder-logo.png";
    try {
      let urlString = Array.isArray(raw) ? raw[0] : String(raw);
      // 處理可能的 JSON 字串格式
      if (typeof urlString === 'string' && urlString.startsWith('[')) {
        const parsed = JSON.parse(urlString);
        urlString = Array.isArray(parsed) ? parsed[0] : urlString;
      }
      const clean = urlString.replace(/[\[\]"']/g, "").trim();
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

  // ... (Loading 與 未登入畫面保持不變)

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      {/* Header 與 Banner 區塊 */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">市集首頁</h1>
      </header>

      {/* ... (搜尋框與分類標籤區塊) */}

      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
            <Flame className="h-4 w-4 text-[#D35400] fill-[#D35400]" />熱門推薦
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
                // ✨ 這裡連向 app/products/[id]/page.tsx
                href={`/products/${product.id}`} 
                className="block group active:scale-[0.96] transition-transform duration-200"
              >
                <Card className="h-full overflow-hidden bg-white border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[24px] flex flex-col group-hover:shadow-md transition-all">
                  {/* 圖片容器 */}
                  <div className="aspect-square bg-[#FDFBF7] relative overflow-hidden flex items-center justify-center">
                    <img 
                      src={getCleanImageUrl(product)} 
                      alt={product.name} 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                    />
                    {/* 分類標籤 */}
                    <div className="absolute top-2 left-2">
                      <Badge className="text-[9px] bg-white/90 backdrop-blur-md text-[#D35400] px-2 py-0.5 rounded-lg font-bold border-none shadow-sm">
                        {CATEGORY_LABELS[product.category] || "其他"}
                      </Badge>
                    </div>
                  </div>

                  {/* 文字資訊區 */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-[13px] text-slate-800 line-clamp-1 group-hover:text-[#D35400] transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                        {product.description || "南台二手優質商品"}
                      </p>
                    </div>

                    <div className="pt-3">
                      <p className="text-lg font-black text-[#D35400] leading-none">
                        <span className="text-xs mr-0.5">NT$</span>
                        {product.price?.toLocaleString()}
                      </p>
                      
                      {/* 底部裝飾線與日期 */}
                      <div className="flex items-center justify-between text-[9px] text-slate-300 border-t border-dashed border-orange-100 mt-3 pt-2">
                        <span className="flex items-center gap-1 font-bold uppercase tracking-tighter">
                          <Calendar className="h-2.5 w-2.5" /> {formatDate(product.created_at)}
                        </span>
                        <span className="bg-orange-50 text-[#D35400] p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                          <Sparkles className="h-3 w-3" />
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
