
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { ProductCard } from "@/components/product-card";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

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

export default function FavoritesPage() {
  const {
    isLoading: liffLoading,
    lineUserId,
    login,
  } = useLiff();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsEmailLogin, setNeedsEmailLogin] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (liffLoading) return;

    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      setErrorMessage("");

      try {
        if (!lineUserId) {
          setProducts([]);
          return;
        }

        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          if (!cancelled) {
            setNeedsEmailLogin(true);
            setProducts([]);
          }
          return;
        }

        if (!cancelled) setNeedsEmailLogin(false);

        const { data: favorites, error: favoriteError } =
          await supabase
            .from("favorites")
            .select("product_id, created_at")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });

        if (favoriteError) throw favoriteError;

        const ids = (favorites || []).map(
          (favorite) => favorite.product_id as string
        );

        if (ids.length === 0) {
          if (!cancelled) setProducts([]);
          return;
        }

        const { data: productData, error: productError } =
          await supabase
            .from("products")
            .select(
              "id, name, price, category, description, status, created_at, approved_at, image_url"
            )
            .in("id", ids)
            .eq("status", "approved");

        if (productError) throw productError;

        const order = new Map(
          ids.map((id, index) => [id, index])
        );

        const sorted = (
          (productData || []) as Product[]
        ).sort(
          (a, b) =>
            (order.get(a.id) ?? 0) -
            (order.get(b.id) ?? 0)
        );

        if (!cancelled) setProducts(sorted);
      } catch (error) {
        console.error("載入我的最愛失敗:", error);

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "讀取收藏失敗，請稍後再試。"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [liffLoading, lineUserId]);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
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
        {liffLoading || loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
            <p className="text-sm text-slate-500">
              正在載入收藏商品...
            </p>
          </div>
        ) : !lineUserId ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Heart className="mx-auto mb-4 h-12 w-12 text-rose-300" />
            <h2 className="font-bold">請先登入 LINE</h2>
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
        ) : needsEmailLogin ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="font-bold">請先驗證學校信箱</h2>
            <p className="mt-2 text-sm text-slate-500">
              收藏紀錄會與你的學校信箱登入帳號同步。
            </p>
            <Button asChild className="mt-5 bg-[#D35400]">
              <Link href="/profile">前往個人中心</Link>
            </Button>
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : products.length === 0 ? (
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
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                收藏的商品
              </h2>
              <span className="text-xs text-slate-400">
                共 {products.length} 件
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavoriteChange={(isFavorite) => {
                    if (!isFavorite) {
                      setProducts((previous) =>
                        previous.filter(
                          (item) => item.id !== product.id
                        )
                      );
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
