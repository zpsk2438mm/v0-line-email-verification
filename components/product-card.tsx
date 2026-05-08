"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: any }) {
  // 檢查 ID 是否存在，避免產生無效的連結
  if (!product?.id) return null;

  // 處理圖片顯示邏輯，相容陣列與字串格式
  const getDisplayImage = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    if (Array.isArray(url)) return url[0];
    if (typeof url === "string" && url.startsWith("[")) {
      try {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) ? parsed[0] : url;
      } catch {
        return url;
      }
    }
    return url;
  };

  return (
    <Link 
      href={`/products/${product.id}`} 
      // relative z-10 確保卡片不會被背景元素遮擋，block 確保整個區域都可點擊
      className="relative z-10 block group cursor-pointer no-underline"
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col h-full">
        {/* 圖片區域 */}
        <div className="relative aspect-square bg-slate-50 overflow-hidden">
          <img 
            src={getDisplayImage(product.image_url)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge className="absolute top-3 left-3 bg-white/80 backdrop-blur-md text-slate-700 border-none">
            {product.category}
          </Badge>
        </div>

        {/* 文字區域 */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-slate-800 truncate mb-1">{product.name}</h3>
          <p className="text-xs text-slate-400 line-clamp-1 mb-4">{product.description}</p>
          
          <div className="flex justify-between items-end mt-auto">
            <span className="text-rose-500 font-black text-lg">
              NT$ {Number(product.price).toLocaleString()}
            </span>
            <span className="text-[11px] text-blue-500 font-bold">查看詳情 🔍</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
