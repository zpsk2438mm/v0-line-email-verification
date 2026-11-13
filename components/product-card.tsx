
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  image_url?: unknown;
  images?: unknown;
  created_at?: string;
  approved_at?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  tools_stationery: "文具/專業工具",
  dorm_supplies: "租屋收納/雜貨",
  hobbies: "遊戲/娛樂",
  cosmetics: "化妝品/美妝",
  food: "食物/零食",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

function getDisplayImage(value: unknown): string {
  if (!value) return "/placeholder-logo.png";

  if (Array.isArray(value)) {
    return getDisplayImage(value[0]);
  }

  if (typeof value !== "string") {
    return "/placeholder-logo.png";
  }

  let result = value.trim();

  if (result.startsWith("[")) {
    try {
      return getDisplayImage(JSON.parse(result));
    } catch {
      return "/placeholder-logo.png";
    }
  }

  if (!result) return "/placeholder-logo.png";

  if (result.startsWith("https://")) return result;

  if (result.startsWith("/")) {
    if (result === "/placeholder-logo.png") return result;
    result = result.slice(1);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return "/placeholder-logo.png";

  return `${supabaseUrl}/storage/v1/object/public/product-images/${result}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
  });
}

export function ProductCard({
  product,
  onFavoriteChange,
}: {
  product: Product;
  onFavoriteChange?: (isFavorite: boolean) => void;
}) {
  if (!product?.id) return null;

  const dateText = formatDate(
    product.approved_at || product.created_at
  );

  return (
    <div className="relative group h-full">
      <Link
        href={`/products/${product.id}`}
        className="block h-full no-underline active:scale-[0.98] transition-transform"
      >
        <div className="h-full overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="relative aspect-square overflow-hidden bg-slate-50">
            <img
              src={getDisplayImage(
                product.image_url || product.images
              )}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src =
                  "/placeholder-logo.png";
              }}
            />

            <Badge
              variant="secondary"
              className="absolute left-2 top-2 max-w-[65%] truncate border-none bg-white/90 text-[9px] font-bold text-[#D35400]"
            >
              {CATEGORY_LABELS[product.category] ||
                product.category ||
                "其他"}
            </Badge>
          </div>

          <div className="flex flex-1 flex-col justify-between p-3">
            <div>
              <h3 className="line-clamp-1 text-sm font-bold text-slate-800 group-hover:text-[#D35400]">
                {product.name}
              </h3>

              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                {product.description || "校園二手好物"}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-base font-extrabold text-[#D35400]">
                NT$ {Number(product.price || 0).toLocaleString("zh-TW")}
              </p>

              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {dateText}
                </span>

                <span className="font-bold text-blue-500">
                  查看詳情
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <FavoriteButton
        productId={product.id}
        onChange={onFavoriteChange}
        className="absolute right-2 top-2"
      />
    </div>
  );
}
