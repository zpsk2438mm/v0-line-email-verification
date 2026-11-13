
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/favorite-button";

export function ProductCard({ product }: { product: any }) {
  if (!product?.id) return null;

  const getDisplayImage = (url: any) => {
    if (!url) return "/placeholder-logo.png";

    if (Array.isArray(url)) {
      return url[0] || "/placeholder-logo.png";
    }

    if (typeof url === "string" && url.startsWith("[")) {
      try {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed)
          ? parsed[0] || "/placeholder-logo.png"
          : url;
      } catch {
        return url;
      }
    }

    return url;
  };

  return (
    <div className="relative group h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">

        {/* 商品詳情連結 */}
        <Link
          href={`/products/${product.id}`}
          className="flex h-full flex-col no-underline"
        >
          {/* 商品圖片 */}
          <div className="relative aspect-square overflow-hidden bg-slate-50">
            <img
              src={getDisplayImage(product.image_url)}
              alt={product.name || "商品圖片"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-logo.png";
              }}
            />

            {/* 左上角分類 */}
            <Badge className="absolute left-3 top-3 border-none bg-white/90 text-slate-700 backdrop-blur-md">
              {product.category}
            </Badge>
          </div>

          {/* 商品文字 */}
          <div className="flex flex-1 flex-col p-4">
            <h3 className="mb-1 truncate font-bold text-slate-800">
              {product.name}
            </h3>

            <p className="mb-4 line-clamp-1 text-xs text-slate-400">
              {product.description || "校園二手好物"}
            </p>

            <div className="mt-auto flex items-end justify-between gap-1">
              <span className="text-lg font-black text-[#D35400]">
                NT$ {Number(product.price || 0).toLocaleString("zh-TW")}
              </span>

              <span className="text-[11px] font-bold text-blue-500">
                查看詳情
              </span>
            </div>
          </div>
        </Link>

        {/* 右上角愛心：獨立於 Link 外 */}
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton productId={product.id} />
        </div>
      </div>
    </div>
  );
}
