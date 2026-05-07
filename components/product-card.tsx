"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: any }) {
  // 如果沒有 id，顯示警告，避免空連結
  if (!product?.id) {
    console.warn("商品缺少 ID:", product);
    return <div>商品資料錯誤</div>;
  }

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
      className="block group cursor-pointer" // 👈 強制加入 cursor-pointer 確保滑鼠移上去會變手指
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 h-full">
        {/* 圖片區域 */}
        <div className="relative aspect-square bg-slate-50">
          <img 
            src={getDisplayImage(product.image_url)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge className="absolute top-2 left-2 bg-white/80 backdrop-blur-md text-slate-700">
            {product.category}
          </Badge>
        </div>

        {/* 文字資訊 */}
        <div className="p-4">
          <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
          <div className="flex justify-between items-end mt-2">
            <span className="text-rose-500 font-black text-lg">NT$ {product.price}</span>
            <span className="text-[10px] text-blue-500 font-bold">查看詳情 🔍</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
