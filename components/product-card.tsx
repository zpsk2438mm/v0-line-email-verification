"use client";

import { Tag, Package } from "lucide-react";

// 自定義簡單的價格與日期格式化函數，避免外部 import 錯誤
function formatPrice(price: number) {
  return `NT$${price.toLocaleString()}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  created_at: string;
  image_url?: string[];
  images?: string[];
};

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
  // 相容不同的資料庫欄位命名 (images 或 image_url)
  const rawImageUrl = product.images?.[0] || product.image_url?.[0];
  const categoryLabel = categoryLabels[product.category] || product.category;

  // 💡 正確的 Supabase 圖片網址拼湊邏輯（防重複拼接）
  let imageUrl = "";
  if (rawImageUrl) {
    if (rawImageUrl.startsWith("http://") || rawImageUrl.startsWith("https://")) {
      imageUrl = rawImageUrl;
    } else if (rawImageUrl.startsWith("product-images/")) {
      imageUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${rawImageUrl}`;
    } else {
      imageUrl = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${rawImageUrl}`;
    }
  }

  return (
    <div className="bg-card rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-secondary relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // 萬一圖片加載失敗，顯示乾淨的灰色包裹圖示，不加載任何奇怪的 Unsplash 網圖
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-12 w-12 text-muted-foreground/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></div>';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
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
