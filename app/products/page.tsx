
"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLiff } from "@/components/liff-provider";
import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import {
  Search,
  ShoppingBag,
  Flame,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ==========================================
// 商品資料格式
// ==========================================

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  status: string;
  is_approved: boolean;
  created_at: string | null;
  approved_at?: string | null;
  image_url?: string | string[] | null;
}

// ==========================================
// 公開商品 API 回傳格式
// ==========================================

interface ProductsResponse {
  success: boolean;
  products?: Product[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ==========================================
// 商品分類
// 保留原本 11 種商品分類
// ==========================================

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

// ==========================================
// API 分頁設定
// ==========================================

const PAGE_LIMIT = 100;
const MAX_PAGES = 1000;

// ==========================================
// 公開市集頁面
// ==========================================

export default function ExploreProductsPage() {
  const { isLoading: liffLoading } = useLiff();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [fetching, setFetching] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  // ========================================
  // 1. 透過公開 API 取得商品
  //
  // 不需要 LINE 登入
  // 不需要校園信箱驗證
  // 不直接存取 Supabase Products
  // ========================================

  useEffect(() => {
    if (liffLoading) return;

    let cancelled = false;

    const controller = new AbortController();

    async function fetchProducts() {
      try {
        setFetching(true);
        setErrorMessage("");

        const allProducts =
          new Map<string, Product>();

        let page = 1;

        // ====================================
        // 自動逐頁取得所有公開商品
        // 避免超過 API 單頁上限時遺漏商品
        // ====================================

        while (true) {
          if (cancelled) return;

          if (page > MAX_PAGES) {
            throw new Error(
              "商品數量超過目前查詢上限。"
            );
          }

          const response = await fetch(
            `/api/products?page=${page}&limit=${PAGE_LIMIT}`,
            {
              method: "GET",
              cache: "no-store",
              headers: {
                Accept: "application/json",
              },
              signal: controller.signal,
            }
          );

          if (cancelled) return;

          const result: ProductsResponse | null =
            await response
              .json()
              .catch(() => null);

          if (cancelled) return;

          if (!response.ok) {
            throw new Error(
              result?.error ||
                `商品載入失敗（HTTP ${response.status}）`
            );
          }

          if (
            !result?.success ||
            !Array.isArray(result.products) ||
            typeof result.pagination?.hasNextPage !==
              "boolean"
          ) {
            throw new Error(
              result?.error ||
                "商品資料回傳格式不正確。"
            );
          }

          // ==================================
          // 確認商品資料及公開狀態
          // ==================================

          for (const product of result.products) {
            if (
              !product ||
              typeof product.id !== "string" ||
              !product.id ||
              typeof product.name !== "string"
            ) {
              throw new Error(
                "商品資料格式不正確。"
              );
            }

            // 額外防護：
            // 只顯示已核准且正常上架的商品
            if (
              product.status !== "approved" ||
              product.is_approved !== true
            ) {
              continue;
            }

            // 使用商品 ID 去除重複資料
            allProducts.set(
              product.id,
              product
            );
          }

          if (!result.pagination.hasNextPage) {
            break;
          }

          page += 1;
        }

        if (cancelled) return;

        setProducts(
          Array.from(allProducts.values())
        );

      } catch (error) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        console.error(
          "載入商品失敗:",
          error
        );

        setProducts([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "商品載入失敗，請重新整理頁面。"
        );

      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    void fetchProducts();

    // ======================================
    // 離開頁面時取消尚未完成的請求
    // 避免舊請求覆蓋新商品資料
    // ======================================

    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [
    liffLoading,
    refreshVersion,
  ]);

  // ========================================
  // 2. 保留原本搜尋及分類篩選
  //
  // 不需要每次輸入文字都呼叫 API
  // 保留即時搜尋的操作體驗
  // ========================================

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) =>
          product.category === selectedCategory
      );
    }

    const query =
      searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(query) ||
          (product.description || "")
            .toLowerCase()
            .includes(query)
      );
    }

    return result;

  }, [
    products,
    selectedCategory,
    searchQuery,
  ]);

  // ========================================
  // 3. 保留原本 LINE 資料同步畫面
  // ========================================

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

  // ========================================
  // 4. 保留原本公開市集 UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">

      {/* 頂部導覽列 */}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">

        <Navigation />

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md">

          <ShoppingBag className="h-5 w-5 text-white" />

        </div>

        <h1 className="text-lg font-bold text-slate-800">

          市集首頁

        </h1>

      </header>

      {/* 搜尋及商品分類 */}

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">

        {/* 商品搜尋欄 */}

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

        {/* 商品分類按鈕 */}

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

      {/* 推薦商品區塊 */}

      <div className="mx-auto mt-4 max-w-lg px-4">

        <div className="mb-4 flex items-center justify-between">

          <h2 className="flex items-center gap-1 text-sm font-bold text-slate-700">

            <Flame className="h-4 w-4 fill-[#D35400] text-[#D35400]" />

            推薦商品

          </h2>

          {/* 商品數量 */}

          <span className="text-xs text-slate-400">

            {fetching
              ? "載入中..."
              : `共 ${filteredProducts.length} 件`}

          </span>

        </div>

        {/* 商品載入畫面 */}

        {fetching ? (

          <div className="py-20 text-center">

            <Loader2 className="mx-auto animate-spin text-orange-300" />

          </div>

        ) : errorMessage ? (

          /* 商品讀取失敗及重新讀取 */

          <div className="rounded-xl bg-red-50 p-5 text-center text-sm text-red-600 space-y-3">

            <p role="alert">

              {errorMessage}

            </p>

            <button
              type="button"
              onClick={() => {
                setFetching(true);

                setRefreshVersion(
                  (prev) => prev + 1
                );
              }}
              className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-bold text-[#D35400] transition-colors hover:bg-orange-50"
            >

              <RefreshCw className="h-4 w-4" />

              重新讀取商品

            </button>

          </div>

        ) : filteredProducts.length === 0 ? (

          /* 沒有符合條件的商品 */

          <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-400">

            目前沒有符合條件的商品

          </div>

        ) : (

          /* 保留原本雙欄商品卡片 */

          <div className="grid grid-cols-2 gap-4">

            {filteredProducts.map(
              (product) => (

                <ProductCard
                  key={product.id}
                  product={product}
                />

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}
