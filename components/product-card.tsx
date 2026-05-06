"use client";

import { Tag, Package } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Product } from "@/lib/supabase";

type ProductCardProps = {
  product: Product;
};

const categoryLabels: Record<string, string> = {
  books: "二手教科書",
  electronics: "電子產品",
  living: "生活用品",
  clothing: "服飾配件",
  furniture: "家具寢具",
  other: "其他",
};

export function ProductCard({ product }: ProductCardProps) {
  const rawImageUrl = product.images?.[0];
  const categoryLabel = categoryLabels[product.category] || product.category;

  // 💡 精準指向你的 product-images 儲存桶
  let imageUrl = "";
  if (rawImageUrl) {
    if (rawImageUrl.startsWith("http://") || rawImageUrl.startsWith("https://")) {
      imageUrl = rawImageUrl;
    } else {
      imageUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${rawImageUrl}`;
    }
  }

  return (
    <div className="bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-secondary relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-foreground text-lg line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-1 mb-3">
          {product.description || "暫無描述"}
        </p>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Tag className="h-3 w-3" />
              {categoryLabel}
            </span>
            <span className="text-primary font-bold text-lg">
              {formatPrice(product.price)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(product.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
