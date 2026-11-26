
"use client";

import { useEffect, useRef, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { contactRequest } from "@/lib/contact-client";
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
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ==========================================
// 商品資料格式
// ==========================================

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  category: string;
  image_url?: string | null;
  images?: string[];
  status: string;
  is_approved: boolean;
  created_at: string;
}

// ==========================================
// 商品狀態篩選
// ==========================================

const STATUS_FILTERS = [
  { id: "approved", label: "🟢 已上架" },
  { id: "pending", label: "🟡 審核中" },
  { id: "rejected", label: "🔴 已退回" },
  { id: "reported", label: "⚠️ 檢舉審核中" },
  { id: "removed", label: "⛔ 違規下架" },
];

// ==========================================
// 商品分類篩選
// ==========================================

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

// ==========================================
// 允許刪除及編輯的商品狀態
// ==========================================

const DELETABLE_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

const EDITABLE_STATUSES = [
  "pending",
  "approved",
];

const PAGE_LIMIT = 100;
const MAX_PAGES = 1000;

// ==========================================
// 我的商品頁面
// ==========================================

export default function MyListingsPage() {
  const {
    lineUserId,
    userEmail,
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

  const [errorMessage, setErrorMessage] =
    useState("");

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const deletingRef = useRef(false);

  const identityKey =
    lineUserId && userEmail && isAuthenticated
      ? `${lineUserId}:${userEmail.toLowerCase()}`
      : "";

  const identityRef = useRef(identityKey);

  const [loadedIdentity, setLoadedIdentity] =
    useState("");

  useEffect(() => {
    identityRef.current = identityKey;
  }, [identityKey]);

  // ========================================
  // 1. 透過安全 API 取得個人商品
  // ========================================

  useEffect(() => {
    if (liffLoading) return;

    if (!identityKey) {
      setMyProducts([]);
      setLoadedIdentity("");
      setErrorMessage("");
      setIsLoadingProducts(false);
      return;
    }

    let cancelled = false;

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        setErrorMessage("");
        setMyProducts([]);

        const allProducts = new Map<string, Product>();

        let page = 1;

        while (true) {
          if (cancelled) return;

          if (page > MAX_PAGES) {
            throw new Error(
              "商品數量超過目前查詢上限，請聯絡管理員。"
            );
          }

          const result = await contactRequest(
            `/api/my-products?page=${page}&limit=${PAGE_LIMIT}`,
            "GET"
          );

          if (cancelled) return;

          if (
            !result?.success ||
            !Array.isArray(result.products) ||
            typeof result.pagination?.hasNextPage !== "boolean"
          ) {
            throw new Error(
              result?.error || "商品資料回傳格式不正確"
            );
          }

          for (const product of result.products as Product[]) {
            if (
              typeof product?.id !== "string" ||
              !product.id
            ) {
              throw new Error("商品資料格式不正確");
            }

            allProducts.set(product.id, product);
          }

          if (!result.pagination.hasNextPage) {
            break;
          }

          page += 1;
        }

        if (!cancelled) {
          setMyProducts(
            Array.from(allProducts.values())
          );

          setLoadedIdentity(identityKey);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("讀取商品失敗:", err);

        setMyProducts([]);

        setLoadedIdentity(identityKey);

        setErrorMessage(
          err instanceof Error
            ? err.message
            : "商品資料讀取失敗，請稍後再試"
        );
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
  }, [
    liffLoading,
    identityKey,
    refreshVersion,
  ]);

  // ========================================
  // 2. 透過安全 API 刪除商品
  // ========================================

  const handleDelete = async (productId: string) => {
    if (
      deletingRef.current ||
      isLoadingProducts
    ) {
      return;
    }

    if (!identityKey) {
      window.alert(
        "請先完成 LINE 登入及校園信箱驗證。"
      );
      return;
    }

    const product = myProducts.find(
      (item) => item.id === productId
    );

    if (!product) {
      window.alert(
        "找不到商品資料，請重新整理後再試。"
      );
      return;
    }

    if (product.status === "reported") {
      window.alert(
        "此商品正在進行檢舉審核，暫時無法刪除。"
      );
      return;
    }

    if (product.status === "removed") {
      window.alert(
        "此商品已因違規下架，請聯絡管理員。"
      );
      return;
    }

    if (!DELETABLE_STATUSES.includes(product.status)) {
      window.alert(
        "目前商品狀態不允許刪除。"
      );
      return;
    }

    if (
      !window.confirm(
        "確定要刪除這項商品嗎？此動作無法復原。"
      )
    ) {
      return;
    }

    const requestIdentity = identityKey;

    try {
      deletingRef.current = true;
      setDeletingId(productId);

      const result = await contactRequest(
        "/api/product-delete",
        "DELETE",
        {
          productId,
        }
      );

      if (
        !result?.success ||
        result.productId !== productId
      ) {
        throw new Error(
          result?.error || "商品刪除失敗"
        );
      }

      if (identityRef.current !== requestIdentity) {
        return;
      }

      setMyProducts((prev) =>
        prev.filter((p) => p.id !== productId)
      );

      window.alert("商品刪除成功");

      // 重新讀取最新商品資料
      setRefreshVersion((prev) => prev + 1);
    } catch (err) {
      console.error("刪除商品失敗:", err);

      if (identityRef.current !== requestIdentity) {
        return;
      }

      window.alert(
        err instanceof Error
          ? err.message
          : "刪除失敗，請稍後再試"
      );

      // 若商品狀態已變更，重新同步清單
      setRefreshVersion((prev) => prev + 1);
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  };

  // ========================================
  // 3. 商品照片處理
  // 相容原本商品照片格式
  // ========================================

  const getCleanImageUrl = (product: Product) => {
    const fallback = "/placeholder-logo.png";

    const raw = product.image_url || product.images;

    if (!raw) return fallback;

    try {
      let urlString = Array.isArray(raw)
        ? raw[0]
        : String(raw);

      if (typeof urlString !== "string") {
        return fallback;
      }

      if (urlString.startsWith("[")) {
        const parsed = JSON.parse(urlString);

        urlString = Array.isArray(parsed)
          ? parsed[0]
          : urlString;
      }

      if (typeof urlString !== "string") {
        return fallback;
      }

      const clean = urlString
        .trim()
        .replace(/[\[\]"']/g, "");

      return /^https?:\/\//i.test(clean)
        ? clean
        : fallback;
    } catch {
      return fallback;
    }
  };

  // ========================================
  // 4. 商品狀態多選篩選
  // ========================================

  const toggleStatusFilter = (id: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // ========================================
  // 5. 商品分類多選篩選
  // ========================================

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

  // ========================================
  // 6. 原本的頁面導覽列
  // ========================================

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

  // ========================================
  // 7. 尚未完成登入驗證
  // ========================================

  if (
    !liffLoading &&
    (!lineUserId || !isAuthenticated || !userEmail)
  ) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <Header />

        <div className="p-8 text-center space-y-4">
          <p>
            我的商品需要 LINE 登入及校園信箱驗證。
          </p>

          {!lineUserId ? (
            <Button onClick={login}>
              使用 LINE 登入
            </Button>
          ) : (
            <Link href="/?next=%2Fmy-listings">
              <Button>
                前往校園信箱驗證
              </Button>
            </Link>
          )}
        </div>
      </main>
    );
  }

  // ========================================
  // 8. 商品載入畫面
  // ========================================

  if (
    liffLoading ||
    isLoadingProducts ||
    loadedIdentity !== identityKey
  ) {
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

  // ========================================
  // 9. 商品讀取失敗畫面
  // ========================================

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <Header />

        <div className="max-w-md mx-auto px-6 pt-6">
          <div className="bg-white rounded-[32px] p-8 text-center space-y-4 shadow-sm border border-orange-50">
            <AlertCircle className="h-12 w-12 mx-auto text-rose-400" />

            <h2 className="text-base font-black text-slate-800">
              商品資料讀取失敗
            </h2>

            <p className="text-sm text-slate-500 break-words">
              {errorMessage}
            </p>

            <Button
              onClick={() => {
                setIsLoadingProducts(true);

                setRefreshVersion(
                  (prev) => prev + 1
                );
              }}
              className="rounded-xl bg-[#D35400] hover:bg-[#B84600] text-white font-bold gap-2"
            >
              <RefreshCw className="h-4 w-4" />

              重新讀取
            </Button>

            <div>
              <Link
                href="/profile"
                className="text-sm font-bold text-slate-400 hover:text-[#D35400]"
              >
                返回個人中心
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ========================================
  // 10. 原本的我的商品頁面 UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-12">
      <Header />

      <div className="max-w-md mx-auto px-6 pt-6 space-y-4">

        {/* 商品狀態及分類篩選 */}

        <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-orange-50/50 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 mb-1">
            <Filter className="h-3.5 w-3.5 text-[#D35400]" />

            <span>
              商品狀態與分類篩選 (可複選)
            </span>
          </div>

          {/* 商品狀態 */}

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {STATUS_FILTERS.map((f) => {
              const isSelected =
                selectedStatuses.includes(f.id);

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    toggleStatusFilter(f.id)
                  }
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

          {/* 商品分類 */}

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x border-t border-slate-50 pt-2">
            <button
              type="button"
              onClick={() =>
                setSelectedCategories([])
              }
              className={`snap-center flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all ${
                selectedCategories.length === 0
                  ? "bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-200"
                  : "bg-slate-50 text-slate-600 border-slate-100"
              }`}
            >
              ✨ 全部分類
            </button>

            {CATEGORY_FILTERS.map((f) => {
              const isSelected =
                selectedCategories.includes(f.id);

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    toggleCategoryFilter(f.id)
                  }
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

        {/* 沒有符合條件的商品 */}

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

            {/* 商品卡片 */}

            {filteredProducts.map((product) => {
              const canEdit =
                EDITABLE_STATUSES.includes(
                  product.status
                );

              const canDelete =
                DELETABLE_STATUSES.includes(
                  product.status
                );

              const isDeleting =
                deletingId === product.id;

              return (
                <Card
                  key={product.id}
                  className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden bg-white transition-all"
                >
                  <CardContent className="p-5">
                    <div className="flex gap-5">

                      {/* 商品照片 */}

                      <div className="h-24 w-24 flex-shrink-0 bg-[#FDFBF7] rounded-[24px] overflow-hidden border border-orange-50 shadow-inner">
                        <img
                          src={getCleanImageUrl(product)}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            if (
                              !e.currentTarget.src.endsWith(
                                "/placeholder-logo.png"
                              )
                            ) {
                              e.currentTarget.src =
                                "/placeholder-logo.png";
                            }
                          }}
                        />
                      </div>

                      {/* 商品資訊 */}

                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-base text-slate-800 truncate">
                            {product.name}
                          </h3>

                          {/* 商品狀態標籤 */}

                          {product.status === "approved" ? (
                            <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />

                              已上架
                            </Badge>
                          ) : product.status === "rejected" ? (
                            <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />

                              已退回
                            </Badge>
                          ) : product.status === "removed" ? (
                            <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-red-50 text-red-700 border-none shadow-none flex items-center gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />

                              違規下架
                            </Badge>
                          ) : product.status === "reported" ? (
                            <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-amber-50 text-amber-700 border-none shadow-none flex items-center gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />

                              檢舉審核中
                            </Badge>
                          ) : (
                            <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1 shrink-0">
                              <Clock3 className="h-3 w-3" />

                              審核中
                            </Badge>
                          )}
                        </div>

                        {/* 商品價格 */}

                        <p className="text-lg font-black text-[#D35400] mt-1">
                          NT$ {Number(product.price).toLocaleString("zh-TW")}
                        </p>

                        {/* 商品建立日期 */}

                        <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                          {new Date(
                            product.created_at
                          ).toLocaleDateString("zh-TW")}
                        </p>

                        {/* 編輯及刪除按鈕 */}

                        <div className="mt-4 pt-3 border-t border-dashed border-orange-100 flex items-center justify-between gap-2">

                          {canEdit && !deletingId ? (
                            <Link
                              href={`/edit-listing/${product.id}`}
                              className="text-[13px] text-slate-500 font-black flex items-center gap-1.5 hover:text-[#D35400] transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />

                              編輯商品
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="text-[13px] text-slate-300 font-black flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <Edit3 className="h-4 w-4" />

                              編輯商品
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              !canDelete ||
                              deletingId !== null
                            }
                            onClick={() =>
                              handleDelete(product.id)
                            }
                            className={`text-[13px] font-black flex items-center gap-1.5 transition-opacity ${
                              !canDelete ||
                              deletingId !== null
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-rose-500 hover:opacity-70"
                            }`}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />

                                刪除中
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />

                                刪除商品
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 檢舉審核提示 */}

                    {product.status === "reported" && (
                      <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />

                        <span>
                          此商品正在進行檢舉審核，暫時無法編輯或刪除。
                        </span>
                      </div>
                    )}

                    {/* 違規下架提示 */}

                    {product.status === "removed" && (
                      <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />

                        <span>
                          此商品已因違規下架，如有疑問請聯絡管理員。
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
