
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorite-button";

// 資料庫英文分類轉換成中文
const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  electronic: "電子產品",
  digital: "電子產品",
  books: "書籍教材",
  book: "書籍教材",
  textbooks: "教科書",
  clothing: "服飾配件",
  clothes: "服飾配件",
  fashion: "服飾配件",
  accessories: "配件飾品",
  furniture: "家具用品",
  home: "生活用品",
  household: "生活用品",
  daily: "生活用品",
  daily_necessities: "生活用品",
  sports: "運動用品",
  sport: "運動用品",
  beauty: "美妝保養",
  cosmetics: "美妝保養",
  stationery: "文具用品",
  supplies: "文具用品",
  toys: "玩具娛樂",
  games: "遊戲娛樂",
  entertainment: "休閒娛樂",
  food: "食品",
  appliances: "家電用品",
  transportation: "交通工具",
  vehicles: "交通工具",
  other: "其他",
  others: "其他",
  miscellaneous: "其他",
};

function getCategoryLabel(
  category: unknown
): string {
  if (
    typeof category !== "string" ||
    !category.trim()
  ) {
    return "其他";
  }

  const value = category.trim();
  const key = value.toLowerCase();

  return CATEGORY_LABELS[key] || value;
}

function getDisplayImage(
  value: unknown
): string {
  const fallback = "/placeholder-logo.png";

  if (Array.isArray(value)) {
    return typeof value[0] === "string" &&
      value[0]
      ? value[0]
      : fallback;
  }

  if (typeof value !== "string" || !value) {
    return fallback;
  }

  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return typeof parsed[0] === "string" &&
          parsed[0]
          ? parsed[0]
          : fallback;
      }
    } catch {
      return value;
    }
  }

  return value;
}

interface Product {
  id: string;
  name?: string | null;
  price?: number | string | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | string[] | null;
}

export function ProductCard({
  product,
}: {
  product: Product;
}) {
  if (!product?.id) return null;

  const categoryName = getCategoryLabel(
    product.category
  );

  const imageUrl = getDisplayImage(
    product.image_url
  );

  const price = Number(product.price ?? 0);

  return (
    <div className="group relative h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
        {/* 商品內容 */}
        <Link
          href={`/products/${product.id}`}
          className="flex h-full flex-col no-underline"
        >
          {/* 商品圖片 */}
          <div className="relative aspect-square overflow-hidden bg-slate-50">
            <img
              src={imageUrl}
              alt={
                product.name || "商品圖片"
              }
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(event) => {
                const img =
                  event.currentTarget;

                if (
                  !img.src.endsWith(
                    "/placeholder-logo.png"
                  )
                ) {
                  img.src =
                    "/placeholder-logo.png";
                }
              }}
            />

            {/* 中文分類 */}
            <Badge className="absolute left-3 top-3 max-w-[65%] truncate border-none bg-white/90 text-slate-700 backdrop-blur-md">
              {categoryName}
            </Badge>
          </div>

          {/* 商品文字 */}
          <div className="flex flex-1 flex-col p-4">
            <h3 className="mb-1 truncate font-bold text-slate-800">
              {product.name || "未命名商品"}
            </h3>

            <p className="mb-4 line-clamp-1 text-xs text-slate-400">
              {product.description ||
                "校園二手好物"}
            </p>

            <div className="mt-auto flex items-end justify-between gap-1">
              <span className="text-lg font-black text-[#D35400]">
                NT${" "}
                {Number.isFinite(price)
                  ? price.toLocaleString(
                      "zh-TW"
                    )
                  : "0"}
              </span>

              <span className="text-[11px] font-bold text-blue-500">
                查看詳情
              </span>
            </div>
          </div>
        </Link>

        {/* 愛心與商品連結分開，避免誤點 */}
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton
            productId={product.id}
          />
        </div>
      </div>
    </div>
  );
}
