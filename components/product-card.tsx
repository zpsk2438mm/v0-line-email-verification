"use client";

import { Tag, Package } from "lucide-react";

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
  image_url?: string | string[]; // 相容字串與陣列
  images?: string | string[];    // 相容字串與陣列
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
  const categoryLabel = categoryLabels[product.category] || product.category;

  // 💡 核心：完美解析並去除 [" "] 污染的網址提取器
  const getCleanImageUrl = () => {
    // 1. 取得原始欄位值 (優先拿 image_url，因為你的資料表欄位叫 image_url)
    let raw = product.image_url || product.images;
    if (!raw) return "";

    let urlString = "";

    // 2. 如果本身就是陣列，取第一個
    if (Array.isArray(raw)) {
      urlString = raw[0] || "";
    } else if (typeof raw === "string") {
      urlString = raw;
    }

    if (!urlString) return "";

    // 3. 終極去污染：去除可能殘留的 [" ] [ ] \ 等 JSON 格式字串字元
    let clean = urlString
      .trim()
      .replace(/^\[['"]?/, "")  // 去除開頭的 [" 或 ['
      .replace(/['"]?\]$/, "")  // 去除結尾的 "] 或 ']
      .replace(/\\/g, "")       // 去除斜線轉義字元
      .replace(/^['"]/, "")     // 去除前後多餘引號
      .replace(/['"]$/, "")
      .trim();

    // 4. 補全 Supabase 域名邏輯
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    } else {
      const cleanPath = clean.replace(/^\//, "");
      if (cleanPath.startsWith("product-images/")) {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${cleanPath}`;
      } else {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
      }
    }
  };

  const imageUrl = getCleanImageUrl();

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
              console.error("圖片加載失敗，解析出的網址為:", imageUrl);
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
