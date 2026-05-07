"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: any }) {
  // 🖼️ 加入解析邏輯，確保 ["https://..."] 這種格式也能抓到第一張圖
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
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 h-full">
        {/* 圖片區域 */}
        <div className="relative aspect-square bg-slate-50">
          <img 
            src={getDisplayImage(product.image_url)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
          />
          <Badge className="absolute top-2 left-2 bg-white/80 backdrop-blur-md text-slate-700 border-none shadow-sm">
            {product.category}
          </Badge>
        </div>

        {/* 文字資訊 */}
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
          <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>
          <div className="flex justify-between items-end pt-2">
            <span className="text-rose-500 font-black text-lg">NT$ {product.price?.toLocaleString()}</span>
            <span className="text-[10px] text-blue-500 flex items-center font-bold">查看 🔍</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
