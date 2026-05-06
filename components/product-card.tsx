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
  image_url?: any; // 放寬型態，防止任何不期而遇的資料結構
  images?: any;    // 放寬型態，防止任何不期而遇的資料結構
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

  // 💡 終極無敵防呆解析
  const getCleanImageUrl = () => {
    // 1. 抓取所有可能存圖片的欄位
    let raw = product.image_url || product.images;
    if (!raw) return "";

    let urlString = "";

    // 2. 如果是陣列，取第一個值
    if (Array.isArray(raw)) {
      urlString = raw[0] || "";
    } else if (typeof raw === "string") {
      // 3. 如果是字串，但看起來像 JSON 陣列 (例如以 [ 開頭)
      if (raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            urlString = parsed[0] || "";
          } else {
            urlString = parsed;
          }
        } catch (e) {
          urlString = raw; // 解析失敗就直接用原字串
        }
      } else {
        urlString = raw;
      }
    } else {
      urlString = String(raw);
    }

    if (!urlString) return "";

    // 4. 清除前後所有可能殘留的引號、中括號、反斜線
    let clean = urlString
      .trim()
      .replace(/^\[['"]?/, "")  // 去除開頭的 [" 或 ['
      .replace(/['"]?\]$/, "")  // 去除結尾的 "] 或 ']
      .replace(/\\/g, "")       // 去除反斜線
      .replace(/^['"]/, "")     // 去除最外層多餘引號
      .replace(/['"]$/, "")
      .trim();

    // 5. 輸出完整合法的網址
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

  // 方便開發者在主控台檢查到底傳入了什麼怪資料
  console.log(`[ProductCard] 商品: ${product.name} | 原始資料:`, {
    image_url: product.image_url,
    images: product.images,
    最終解析網址: imageUrl
  });

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
              console.error("[ProductCard] 圖片載入失敗，網址:", imageUrl);
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
