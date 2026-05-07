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
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-transparent flex flex-col h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={getDisplayImage(product.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          
          {/* ✅ 左上角標籤改為橘色調 */}
          <Badge className="absolute top-4 left-4 bg-orange-100 text-[#D95300] hover:bg-orange-100 border-none px-3 py-1 rounded-full font-bold">
            {product.category}
          </Badge>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-black text-gray-800 text-lg mb-1 truncate">{product.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-1 mb-4 font-medium">{product.description || "暫無描述"}</p>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-[#D95300] font-black text-2xl">
              <span className="text-sm mr-0.5">NT$</span>
              {Number(product.price).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
