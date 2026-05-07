"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: any }) {
  if (!product?.id) return null;

  const getDisplayImage = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    if (Array.isArray(url)) return url[0];
    return url;
  };

  return (
    <Link href={`/products/${product.id}`} className="relative z-10 block group cursor-pointer no-underline">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 flex flex-col h-full">
        <div className="relative aspect-square bg-slate-50 overflow-hidden">
          <img src={getDisplayImage(product.image_url)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {/* ✅ 這裡改為橘色背景與文字 */}
          <Badge className="absolute top-3 left-3 bg-[#FFF5EE] text-[#D95300] border-none font-bold">
            {product.category}
          </Badge>
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-slate-800 truncate mb-1">{product.name}</h3>
          <p className="text-xs text-slate-400 line-clamp-1 mb-4">{product.description}</p>
          <div className="flex justify-between items-end mt-auto">
            {/* ✅ 價格改為深橘色 */}
            <span className="text-[#D95300] font-black text-lg">
              NT$ {Number(product.price).toLocaleString()}
            </span>
            <span className="text-[11px] text-blue-500 font-bold">查看詳情 🔍</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
