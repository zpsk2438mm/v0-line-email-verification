
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import {
  Search,
  ShoppingBag,
  Flame,
  Loader2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  status: string;
  created_at: string;
  approved_at?: string | null;
  image_url?: unknown;
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
  const { isLoading: liffLoading } = useLiff();

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  useEffect(() => {
    if (liffLoading) return;

    let cancelled = false;

    async function fetchProducts() {
      try {
        setFetching(true);
        setErrorMessage("");

        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, category, description, status, created_at, approved_at, image_url"
          )
          .eq("status", "approved")
          .order("approved_at", {
            ascending: false,
            nullsFirst: false,
          })
          .order("created_at", {
            ascending: false,
          });

        if (error) throw error;

        if (!cancelled) {
          setProducts((data || []) as Product[]);
        }
      } catch (error) {
        console.error("載入商品失敗:", error);

        if (!cancelled) {
          setErrorMessage("商品載入失敗，請重新整理頁面。");
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    }

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [liffLoading]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) => product.category === selectedCategory
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description || "")
            .toLowerCase()
            .includes(query)
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  if (liffLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FDFBF7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
        <p className="text-sm text-slate-500">
          正在安全同步您的 LINE 個人資料...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>

        <h1 className="text-lg font-bold text-slate-800">
          市集首頁
        </h1>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <Input
            type="search"
            placeholder="搜尋商品..."
            className="rounded-xl border-slate-200 bg-white py-5 pl-10 pr-4 focus-visible:ring-[#D35400]"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() =>
                setSelectedCategory(category.id)
              }
              className={`h-9 shrink-0 rounded-full px-4 text-xs font-medium transition-all ${
                selectedCategory === category.id
                  ? "bg-[#D35400] text-white shadow-md"
                  : "border bg-white text-slate-600"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-lg px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-1 text-sm font-bold text-slate-700">
            <Flame className="h-4 w-4 fill-[#D35400] text-[#D35400]" />
            推薦商品
          </h2>

          <span className="text-xs text-slate-400">
            共 {filteredProducts.length} 件
          </span>
        </div>

        {fetching ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto animate-spin text-orange-300" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl bg-red-50 p-5 text-center text-sm text-red-600">
            {errorMessage}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-400">
            目前沒有符合條件的商品
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
