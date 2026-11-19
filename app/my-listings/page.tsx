
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
  CheckCircle2,
  Clock3,
  Trash2,
  Edit3,
  ChevronLeft,
  AlertCircle,
  Filter,
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
  status: string;
  is_approved: boolean;
  created_at: string;
}

const STATUS_FILTERS = [
  { id: "approved", label: "🟢 已上架" },
  { id: "pending", label: "🟡 審核中" },
  { id: "rejected", label: "🔴 已退回" },
  { id: "removed", label: "⛔ 違規下架" },
];

const CATEGORY_FILTERS = [
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

export default function MyListingsPage() {
  const {
    lineUserId,
    isAuthenticated,
    login,
    isLoading: liffLoading,
  } = useLiff();

  const [myProducts, setMyProducts] =
    useState<Product[]>([]);

  const [isLoadingProducts, setIsLoadingProducts] =
    useState(true);

  const [selectedStatuses, setSelectedStatuses] =
    useState<string[]>([]);

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);

  useEffect(() => {
    if (liffLoading || !lineUserId || !isAuthenticated) {
      if (!liffLoading) setIsLoadingProducts(false);
      return;
    }

    let cancelled = false;

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("line_user_id", lineUserId)
          .order("created_at", {
            ascending: false,
          });

        if (error) throw error;

        if (!cancelled) {
          setMyProducts(data || []);
        }
      } catch (err) {
        console.error("讀取商品失敗:", err);
      } finally {
        if (!cancelled) {
          setIsLoadingProducts(false);
        }
      }
    }

    void fetchMyProducts();

    return () => {
      cancelled = true;
    };
  }, [liffLoading, lineUserId, isAuthenticated]);

  const handleDelete = async (productId: string) => {
    if (!window.confirm("確定要刪除這項商品嗎？此動作無法復原。")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("line_user_id", lineUserId);

      if (error) throw error;

      setMyProducts((prev) =>
        prev.filter((p) => p.id !== productId)
      );
    } catch (err) {
      console.error("刪除商品失敗:", err);
      window.alert("刪除失敗，請稍後再試");
    }
  };

  const getCleanImageUrl = (product: Product) => {
    const fallback = "/placeholder-logo.png";
    const raw = product.image_url || product.images;

    if (!raw) return fallback;

    try {
      let urlString = Array.isArray(raw)
        ? raw[0]
        : String(raw);

      if (urlString.startsWith("[")) {
        const parsed = JSON.parse(urlString);
        urlString = Array.isArray(parsed)
          ? parsed[0]
          : urlString;
      }

      const clean = urlString
        .trim()
        .replace(/[\[\]"']/g, "");

      return clean.startsWith("http")
        ? clean
        : fallback;
    } catch {
      return fallback;
    }
  };

  const toggleStatusFilter = (id: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const toggleCategoryFilter = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const filteredProducts = myProducts.filter((product) => {
    const statusMatch =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(product.status);

    const categoryMatch =
      selectedCategories.length === 0 ||
      selectedCategories.includes(product.category);

    return statusMatch && categoryMatch;
  });

  const Header = () => (
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
      <Navigation />

      <Link href="/profile">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-slate-400"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </Link>

      <h1 className="text-lg font-black text-slate-800 tracking-tight">
        我的商品
      </h1>
    </header>
  );

  if (!liffLoading && (!lineUserId || !isAuthenticated)) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <Header />

        <div className="p-8 text-center space-y-4">
          <p>我的商品需要 LINE 登入及校園信箱驗證。</p>

          {!lineUserId ? (
            <Button onClick={login}>
              使用 LINE 登入
            </Button>
          ) : (
            <Link href="/">
              <Button>前往校園信箱驗證</Button>
            </Link>
          )}
        </div>
      </main>
    );
  }

  if (liffLoading || isLoadingProducts) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <Header />

        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Skeleton className="h-40 w-full rounded-[32px]" />
          <Skeleton className="h-40 w-full rounded-[32px]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-12">
      <Header />

      <div className="max-w-md mx-auto px-6 pt-6 space-y-4">
        <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-orange-50/50 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 mb-1">
            <Filter className="h-3.5 w-3.5 text-[#D35400]" />
            <span>商品狀態與分類篩選 (可複選)</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {STATUS_FILTERS.map((f) => {
              const isSelected = selectedStatuses.includes(f.id);

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleStatusFilter(f.id)}
                  className={`snap-center flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    isSelected
                      ? "bg-[#D35400] text-white border-[#D35400] shadow-md shadow-orange-100"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x border-t border-slate-50 pt-2">
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              className={`snap-center flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                selectedCategories.length === 0
                  ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-200"
                  : "bg-slate-50 text-slate-600 border-slate-100"
              }`}
            >
              ✨ 全部分類
            </button>

            {CATEGORY_FILTERS.map((f) => {
              const isSelected = selectedCategories.includes(f.id);

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleCategoryFilter(f.id)}
                  className={`snap-center flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    isSelected
                      ? "bg-[#D35400] text-white border-[#D35400] shadow-md shadow-orange-100"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-white rounded-[32px] p-8 shadow-sm border border-orange-50">
            <Package className="h-16 w-16 mx-auto text-orange-100" />

            <p className="font-bold text-slate-400">
              沒有符合篩選條件的商品喔
            </p>

            {(selectedStatuses.length > 0 ||
              selectedCategories.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStatuses([]);
                  setSelectedCategories([]);
                }}
                className="rounded-xl border-slate-200 font-bold text-slate-600 text-xs"
              >
                重設篩選條件
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden bg-white transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex gap-5">
                    <div className="h-24 w-24 flex-shrink-0 bg-[#FDFBF7] rounded-[24px] overflow-hidden border border-orange-50 shadow-inner">
                      <img
                        src={getCleanImageUrl(product)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/placeholder-logo.png";
                        }}
                      />
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-base text-slate-800 truncate">
                          {product.name}
                        </h3>

                        {product.status === "approved" ? (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            已上架
                          </Badge>
                        ) : product.status === "rejected" ? (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            已退回
                          </Badge>
                        ) : product.status === "removed" ? (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-red-50 text-red-700 border-none shadow-none flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            違規下架
                          </Badge>
                        ) : (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            審核中
                          </Badge>
                        )}
                      </div>

                      <p className="text-lg font-black text-[#D35400] mt-1">
                        NT$ {Number(product.price).toLocaleString("zh-TW")}
                      </p>

                      <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                        {new Date(
                          product.created_at
                        ).toLocaleDateString("zh-TW")}
                      </p>

                      <div className="mt-4 pt-3 border-t border-dashed border-orange-100 flex items-center justify-between">
                        <Link
                          href={`/edit-listing/${product.id}`}
                          className="text-[13px] text-slate-500 font-black flex items-center gap-1.5 hover:text-[#D35400] transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                          編輯商品
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(product.id)
                          }
                          className="text-[13px] text-rose-500 font-black flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                          刪除商品
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
