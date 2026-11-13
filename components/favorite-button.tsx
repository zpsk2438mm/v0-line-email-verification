
"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/liff-provider";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  onChange?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  productId,
  className = "",
  onChange,
}: FavoriteButtonProps) {
  const { lineUserId, isLoading } = useLiff();
  const { toast } = useToast();

  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadFavorite = useCallback(async () => {
    setLoading(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user || !lineUserId) {
        setFavorite(false);
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userData.user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;

      setFavorite(Boolean(data));
    } catch (error) {
      console.error("讀取收藏失敗:", error);
    } finally {
      setLoading(false);
    }
  }, [productId, lineUserId]);

  useEffect(() => {
    if (isLoading) return;

    void loadFavorite();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => {
        void loadFavorite();
      });

    return () => subscription.unsubscribe();
  }, [isLoading, loadFavorite]);

  async function toggleFavorite(
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (saving || loading) return;

    if (!lineUserId) {
      toast({
        title: "請先登入 LINE",
        description: "登入 LINE 後才能收藏商品。",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("請先完成學校信箱登入驗證。");
      }

      const userId = userData.user.id;

      if (favorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (error) throw error;

        setFavorite(false);
        onChange?.(false);

        toast({
          title: "已取消收藏",
        });
      } else {
        const { error } = await supabase
          .from("favorites")
          .upsert(
            {
              user_id: userId,
              product_id: productId,
            },
            {
              onConflict: "user_id,product_id",
            }
          );

        if (error) throw error;

        setFavorite(true);
        onChange?.(true);

        toast({
          title: "❤️ 已加入我的最愛",
        });
      }
    } catch (error) {
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
      disabled={loading || saving}
      aria-label={favorite ? "取消收藏" : "加入最愛"}
      aria-pressed={favorite}
      title={favorite ? "取消收藏" : "加入我的最愛"}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition-transform hover:scale-110 disabled:opacity-60 ${className}`}
    >
      {loading || saving ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <Heart
          className={`h-5 w-5 ${
            favorite
              ? "fill-rose-500 text-rose-500"
              : "text-slate-500"
          }`}
        />
      )}
    </button>
  );
}
