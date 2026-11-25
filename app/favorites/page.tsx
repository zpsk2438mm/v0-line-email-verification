
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Loader2,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

// ==========================================
// 公開商品資料格式
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
// 收藏紀錄格式
// ==========================================

interface FavoriteRecord {
  product_id: string;
  created_at: string;
}

// ==========================================
// 查詢設定
// ==========================================

const FAVORITE_PAGE_SIZE = 100;
const MAX_FAVORITE_PAGES = 1000;
const PRODUCT_BATCH_SIZE = 6;

// ==========================================
// 驗證商品 UUID
// ==========================================

function validUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ==========================================
// 透過公開 API 取得單一商品
// ==========================================

async function fetchPublicProduct(
  productId: string,
  signal: AbortSignal
): Promise<Product | null> {
  if (!validUUID(productId)) {
    return null;
  }

  const response = await fetch(
    `/api/products?id=${encodeURIComponent(productId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal,
    }
  );

  const result = await response
    .json()
    .catch(() => null);

  // ========================================
  // 商品已下架、檢舉、待審核或不存在
  // 不顯示商品，但保留原本收藏紀錄
  // ========================================

  if (
    response.status === 404 &&
    result?.success === false &&
    result?.error === "商品不存在或目前尚未公開"
  ) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        `商品讀取失敗（HTTP ${response.status}）`
    );
  }

  if (
    !result?.success ||
    !result.product
  ) {
    throw new Error(
      "商品資料回傳格式不正確。"
    );
  }

  const product =
    result.product as Product;

  // ========================================
  // 確認回傳商品 ID 正確
  // ========================================

  if (
    product.id !== productId ||
    typeof product.name !== "string"
  ) {
    throw new Error(
      "商品資料驗證失敗。"
    );
  }

  // ========================================
  // 只允許顯示正常上架商品
  // ========================================

  if (
    product.status !== "approved" ||
    product.is_approved !== true
  ) {
    return null;
  }

  return product;
}

// ==========================================
// 我的最愛頁面
// ==========================================

export default function FavoritesPage() {
  const {
    isLoading: liffLoading,
    lineUserId,
    userEmail,
    isAuthenticated,
    login,
  } = useLiff();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [needsEmailLogin, setNeedsEmailLogin] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const [loadedIdentity, setLoadedIdentity] =
    useState("");

  // 暫時隱藏取消收藏的商品
  // 保留元件，讓收藏失敗時可以恢復畫面

  const [hiddenProductIds, setHiddenProductIds] =
    useState<Set<string>>(new Set());

  // ========================================
  // 目前登入者身分
  // ========================================

  const identityKey =
    lineUserId &&
    userEmail &&
    isAuthenticated
      ? `${lineUserId}:${userEmail.toLowerCase()}`
      : "";

  // ========================================
  // 1. 讀取個人收藏商品
  // ========================================

  useEffect(() => {
    if (liffLoading) return;

    let cancelled = false;

    const controller =
      new AbortController();

    setProducts([]);
    setHiddenProductIds(new Set());
    setErrorMessage("");
    setNeedsEmailLogin(false);
    setLoadedIdentity("");
    setLoading(true);

    // ======================================
    // 尚未登入 LINE
    // ======================================

    if (!lineUserId) {
      setLoading(false);
      return;
    }

    // ======================================
    // 尚未完成校園信箱驗證
    // ======================================

    if (!identityKey) {
      setNeedsEmailLogin(true);
      setLoading(false);
      return;
    }

    async function loadFavorites() {
      try {
        // ==================================
        // 2. 取得目前 Supabase Auth 使用者
        // ==================================

        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        const currentUser =
          userData?.user;

        if (
          userError ||
          !currentUser ||
          !currentUser.email ||
          !currentUser.email
            .toLowerCase()
            .endsWith("@stust.edu.tw") ||
          currentUser.email.toLowerCase() !==
            userEmail?.toLowerCase()
        ) {
          setNeedsEmailLogin(true);
          setProducts([]);
          return;
        }

        setNeedsEmailLogin(false);

        // ==================================
        // 3. 讀取自己的收藏紀錄
        //
        // favorites 仍使用原本 RLS
        // 不直接讀取 products 資料表
        // ==================================

        const favoriteRecords:
          FavoriteRecord[] = [];

        let favoritePage = 0;

        while (true) {
          if (cancelled) return;

          if (
            favoritePage >= MAX_FAVORITE_PAGES
          ) {
            throw new Error(
              "收藏數量超過目前查詢上限。"
            );
          }

          const from =
            favoritePage * FAVORITE_PAGE_SIZE;

          const to =
            from + FAVORITE_PAGE_SIZE - 1;

          const {
            data: favorites,
            error: favoriteError,
          } = await supabase
            .from("favorites")
            .select("product_id, created_at")
            .eq("user_id", currentUser.id)
            .order("created_at", {
              ascending: false,
            })
            .order("product_id", {
              ascending: true,
            })
            .range(from, to)
            .abortSignal(controller.signal);

          if (cancelled) return;

          if (favoriteError) {
            throw new Error(
              favoriteError.message
            );
          }

          const records =
            (favorites || []) as FavoriteRecord[];

          favoriteRecords.push(
            ...records
          );

          if (
            records.length < FAVORITE_PAGE_SIZE
          ) {
            break;
          }

          favoritePage += 1;
        }

        // ==================================
        // 4. 整理收藏商品 ID
        // 保留最新收藏順序並去除重複
        // ==================================

        const ids = Array.from(
          new Set(
            favoriteRecords
              .map(
                (favorite) =>
                  favorite.product_id
              )
              .filter(
                (productId) =>
                  typeof productId === "string" &&
                  validUUID(productId)
              )
          )
        );

        if (ids.length === 0) {
          setProducts([]);
          return;
        }

        // ==================================
        // 5. 透過公開商品 API 取得商品
        //
        // 每批最多同時查詢六件商品
        // 避免一次發送過多 API 請求
        // ==================================

        const publicProducts: Product[] = [];

        for (
          let index = 0;
          index < ids.length;
          index += PRODUCT_BATCH_SIZE
        ) {
          if (cancelled) return;

          const batch = ids.slice(
            index,
            index + PRODUCT_BATCH_SIZE
          );

          const results = await Promise.all(
            batch.map((productId) =>
              fetchPublicProduct(
                productId,
                controller.signal
              )
            )
          );

          if (cancelled) return;

          for (const product of results) {
            if (product !== null) {
              publicProducts.push(product);
            }
          }
        }

        // ==================================
        // 6. 保留原本最新收藏排序
        // ==================================

        const order = new Map(
          ids.map(
            (productId, index) => [
              productId,
              index,
            ]
          )
        );

        publicProducts.sort(
          (a, b) =>
            (order.get(a.id) ?? 0) -
            (order.get(b.id) ?? 0)
        );

        if (!cancelled) {
          setProducts(publicProducts);
        }

      } catch (error) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        console.error(
          "載入我的最愛失敗:",
          error
        );

        setProducts([]);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "讀取收藏失敗，請稍後再試。"
        );

      } finally {
        if (!cancelled) {
          setLoadedIdentity(identityKey);
          setLoading(false);
        }
      }
    }

    void loadFavorites();

    // ======================================
    // 防止離開頁面或切換帳號後
    // 舊請求覆蓋目前使用者的收藏
    // ======================================

    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [
    liffLoading,
    lineUserId,
    userEmail,
    identityKey,
    refreshVersion,
  ]);

  // ========================================
  // 7. 處理取消收藏及收藏失敗恢復
  // ========================================

  const handleFavoriteChange = (
    productId: string,
    isFavorite: boolean
  ) => {
    setHiddenProductIds((previous) => {
      const next = new Set(previous);

      if (isFavorite) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  // ========================================
  // 8. 目前可以顯示的收藏商品
  // ========================================

  const readyProducts =
    identityKey &&
    loadedIdentity === identityKey
      ? products
      : [];

  const visibleProducts =
    readyProducts.filter(
      (product) =>
        !hiddenProductIds.has(product.id)
    );

  const waitingForIdentity =
    Boolean(identityKey) &&
    loadedIdentity !== identityKey;

  // ========================================
  // 9. 保留原本我的最愛 UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">

      {/* 頂部導覽列 */}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">

        <Navigation />

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 shadow-md">

          <Heart className="h-5 w-5 fill-white text-white" />

        </div>

        <h1 className="text-lg font-bold text-slate-800">

          我的最愛

        </h1>

      </header>

      <div className="mx-auto max-w-lg px-4 pt-6">

        {/* 收藏商品載入中 */}

        {liffLoading ||
          loading ||
          waitingForIdentity ? (

          <div className="flex flex-col items-center gap-3 py-20">

            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />

            <p className="text-sm text-slate-500">

              正在載入收藏商品...

            </p>

          </div>

        ) : !lineUserId ? (

          /* 尚未登入 LINE */

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <Heart className="mx-auto mb-4 h-12 w-12 text-rose-300" />

            <h2 className="font-bold">

              請先登入 LINE

            </h2>

            <p className="mt-2 text-sm text-slate-500">

              登入後即可查看收藏商品。

            </p>

            <Button
              className="mt-5 bg-[#D35400]"
              onClick={login}
            >

              LINE 登入

            </Button>

          </div>

        ) : needsEmailLogin ||
          !identityKey ? (

          /* 尚未驗證校園信箱 */

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <h2 className="font-bold">

              請先驗證學校信箱

            </h2>

            <p className="mt-2 text-sm text-slate-500">

              收藏紀錄會與你的學校信箱登入帳號同步。

            </p>

            <Button
              asChild
              className="mt-5 bg-[#D35400]"
            >

              <Link href="/profile">

                前往個人中心

              </Link>

            </Button>

          </div>

        ) : errorMessage ? (

          /* 收藏商品讀取失敗 */

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 space-y-3">

            <p
              role="alert"
              className="break-words"
            >

              {errorMessage}

            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoading(true);

                setRefreshVersion(
                  (previous) => previous + 1
                );
              }}
              className="w-full rounded-xl border-red-100 bg-white text-[#D35400] font-bold gap-2 hover:bg-orange-50"
            >

              <RefreshCw className="h-4 w-4" />

              重新讀取收藏商品

            </Button>

          </div>

        ) : (

          <>

            {/* 尚未收藏任何公開商品 */}

            {visibleProducts.length === 0 ? (

              <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">

                <Heart className="mx-auto mb-4 h-14 w-14 text-rose-200" />

                <h2 className="text-lg font-bold text-slate-800">

                  還沒有收藏商品

                </h2>

                <p className="mt-2 text-sm text-slate-400">

                  到市集逛逛，看到喜歡的商品就按愛心吧！

                </p>

                <Button
                  asChild
                  className="mt-6 bg-[#D35400] hover:bg-[#B84600]"
                >

                  <Link href="/products">

                    <ShoppingBag className="mr-2 h-4 w-4" />

                    前往搜尋市集

                  </Link>

                </Button>

              </div>

            ) : (

              /* 收藏商品標題及數量 */

              <div className="mb-5 flex items-center justify-between">

                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">

                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />

                  收藏的商品

                </h2>

                <span className="text-xs text-slate-400">

                  共 {visibleProducts.length} 件

                </span>

              </div>

            )}

            {/* =================================
                保留原本雙欄商品卡片

                取消收藏時先隱藏商品
                不立即卸載 FavoriteButton
                若資料庫儲存失敗可恢復顯示
            ================================= */}

            <div
              className={
                visibleProducts.length > 0
                  ? "grid grid-cols-2 gap-4"
                  : "hidden"
              }
            >

              {readyProducts.map((product) => (

                <div
                  key={`${identityKey}:${product.id}`}
                  className={
                    hiddenProductIds.has(product.id)
                      ? "hidden"
                      : "h-full"
                  }
                >

                  <ProductCard
                    product={product}
                    onFavoriteChange={(isFavorite) => {
                      handleFavoriteChange(
                        product.id,
                        isFavorite
                      );
                    }}
                  />

                </div>

              ))}

            </div>

          </>

        )}

      </div>

    </main>
  );
}
