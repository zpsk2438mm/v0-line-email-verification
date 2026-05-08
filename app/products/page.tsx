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

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_approved: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (!isAuthenticated && !liffLoading) {
      setIsLoading(false);
      return;
    }

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

    if (isAuthenticated) fetchProducts();
  }, [isAuthenticated, liffLoading]);

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
    let raw = product.image_url || product.images;
    if (!raw) return "";
    let urlString = Array.isArray(raw) ? raw[0] : String(raw);
    let clean = urlString.replace(/[\[\]"']/g, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
  };

  if (liffLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#D95300]" /></div>;

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F9F8F6] flex flex-col justify-center p-4">
        <Card className="w-full max-w-sm mx-auto border-none shadow-xl bg-white overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-tr from-[#D95300] to-[#FF8C00] py-8 px-6 text-center text-white">
            <Sparkles className="h-10 w-10 mx-auto text-yellow-300 animate-pulse mb-2" />
            <h2 className="text-xl font-extrabold">南台科技大學二手機市集</h2>
            <p className="text-xs opacity-90">登入後即可開始尋寶</p>
          </div>
          <CardContent className="p-6">
            <Button onClick={() => login?.()} className="w-full bg-[#D95300] hover:bg-[#B84600] text-white py-6 rounded-xl font-bold">
              <LogIn className="mr-2 h-5 w-5" /> 使用 LINE 登入
            </Button>
          </CardContent>
        </Card>
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
        <h1 className="text-lg font-bold">市集首頁</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="bg-gradient-to-r from-[#FF8C00] to-[#D95300] rounded-2xl p-5 text-white shadow-lg">
          <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">STUST Campus</span>
          <h2 className="text-xl font-black mt-1">屬於南台人的二手淘寶地</h2>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="搜尋商品..." 
            className="pl-10 py-5 rounded-xl border-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all ${
                selectedCategory === cat.id ? "bg-[#D95300] text-white" : "bg-white text-slate-600 border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <Card className="overflow-hidden border-none shadow-sm rounded-2xl bg-white h-full">
                <div className="aspect-square relative bg-slate-50">
                  <img src={getCleanImageUrl(p)} className="w-full h-full object-cover" alt={p.name} />
                  <Badge className="absolute top-2 left-2 bg-[#FFF5EE] text-[#D95300] border-none text-[10px]">
                    {CATEGORY_LABELS[p.category] || "其他"}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h4 className="font-bold text-sm truncate">{p.name}</h4>
                  <p className="text-[#D95300] font-black mt-1">NT$ {p.price.toLocaleString()}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
