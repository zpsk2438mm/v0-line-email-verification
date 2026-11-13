
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/liff-provider";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  onChange?: (isFavorite: boolean) => void;
}

// 所有愛心共用一份收藏資料，減少重複查詢
let cachedUserId: string | null = null;
let cachedFavorites = new Set<string>();
let loaded = false;
let loadingPromise: Promise<void> | null = null;
let sessionPromise: ReturnType<
  typeof supabase.auth.getSession
> | null = null;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function resetCache() {
  cachedUserId = null;
  cachedFavorites = new Set();
  loaded = false;
  loadingPromise = null;
  sessionPromise = null;
  notifyListeners();
}

async function getCurrentUserId() {
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession();
  }

  try {
    const { data, error } = await sessionPromise;

    if (error) throw error;

    return data.session?.user?.id ?? null;
  } finally {
    sessionPromise = null;
  }
}

async function loadFavorites(userId: string) {
  if (cachedUserId !== userId) {
    cachedUserId = userId;
    cachedFavorites = new Set();
    loaded = false;
    loadingPromise = null;
  }

  if (loaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", userId);

    if (error) throw error;

    // 防止舊帳號的查詢結果覆蓋新帳號
    if (cachedUserId !== userId) return;

    cachedFavorites = new Set(
      (data ?? []).map(
        (item: { product_id: string }) =>
          item.product_id
      )
    );

    loaded = true;
    notifyListeners();
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

function updateFavoriteCache(
  productId: string,
  value: boolean
) {
  const next = new Set(cachedFavorites);

  if (value) {
    next.add(productId);
  } else {
    next.delete(productId);
  }

  cachedFavorites = next;
  notifyListeners();
}

export function FavoriteButton({
  productId,
  className = "",
  onChange,
}: FavoriteButtonProps) {
  const {
    lineUserId,
    isAuthenticated,
    isLoading,
  } = useLiff();

  const { toast } = useToast();

  const [favorite, setFavorite] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const fullyLoggedIn =
    Boolean(lineUserId) &&
    isAuthenticated;

  // 讓所有商品卡片同步共用的收藏狀態
  useEffect(() => {
    const syncFavorite = () => {
      setFavorite(
        cachedFavorites.has(productId)
      );
    };

    listeners.add(syncFavorite);
    syncFavorite();

    return () => {
      listeners.delete(syncFavorite);
    };
  }, [productId]);

  // 登入完成後，一次取得所有收藏
  useEffect(() => {
    if (isLoading) return;

    if (!fullyLoggedIn) {
      resetCache();
      return;
    }

    let cancelled = false;

    async function initialize() {
      try {
        const userId =
          await getCurrentUserId();

        if (cancelled || !userId) return;

        await loadFavorites(userId);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "讀取收藏資料失敗:",
            error
          );
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [fullyLoggedIn, isLoading]);

  const goToLogin = useCallback(() => {
    // 記住目前商品所在的頁面
    // 從市集點愛心，登入後返回市集
    // 從商品詳情點愛心，登入後返回該商品
    const currentPath =
      window.location.pathname +
      window.location.search;

    const target =
      currentPath.startsWith("/") &&
      !currentPath.startsWith("//") &&
      !currentPath.startsWith("/\\") &&
      currentPath !== "/"
        ? currentPath
        : `/products/${encodeURIComponent(
            productId
          )}`;

    sessionStorage.setItem(
      "login_next",
      target
    );

    // 先進入首頁的 LINE + 學校信箱驗證
    // 驗證成功後會自動返回 target
    window.location.assign(
      `/?next=${encodeURIComponent(target)}`
    );
  }, [productId]);

  async function toggleFavorite(
    event: MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (saving) return;

    // 尚未登入直接前往驗證畫面
    if (!fullyLoggedIn) {
      goToLogin();
      return;
    }

    setSaving(true);

    try {
      const userId =
        await getCurrentUserId();

      if (!userId) {
        goToLogin();
        return;
      }

      // 確保第一次操作前取得正確收藏狀態
      await loadFavorites(userId);

      const previous =
        cachedFavorites.has(productId);

      const next = !previous;

      // 立即更新畫面，不等待網路回應
      updateFavoriteCache(productId, next);
      onChange?.(next);

      try {
        if (next) {
          const { error } = await supabase
            .from("favorites")
            .upsert(
              {
                user_id: userId,
                product_id: productId,
              },
              {
                onConflict:
                  "user_id,product_id",
              }
            );

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", productId);

          if (error) throw error;
        }

        toast({
          title: next
            ? "❤️ 已加入我的最愛"
            : "已取消收藏",
        });
      } catch (error) {
        // 儲存失敗，恢復原本的愛心狀態
        updateFavoriteCache(
          productId,
          previous
        );

        onChange?.(previous);

        throw error;
      }
    } catch (error) {
      console.error(
        "收藏操作失敗:",
        error
      );

      toast({
        title: "收藏操作失敗",
        description:
          error instanceof Error
            ? error.message
            : "請稍後再試。",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={saving}
      aria-label={
        favorite
          ? "取消收藏"
          : "加入我的最愛"
      }
      aria-pressed={favorite}
      title={
        favorite
          ? "取消收藏"
          : "加入我的最愛"
      }
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition-all hover:scale-110 active:scale-95 ${
        saving
          ? "cursor-wait opacity-80"
          : ""
      } ${className}`}
    >
      <Heart
        className={`h-5 w-5 transition-colors duration-150 ${
          favorite
            ? "fill-rose-500 text-rose-500"
            : "text-slate-500"
        }`}
      />
    </button>
  );
}
