"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: any }) {
  // 1. 安全檢查：如果沒有 ID，點擊會失效，所以在主控台留下警告幫助除錯
  if (!product?.id) {
    console.warn("此商品資料缺少 ID，無法建立連結:", product);
    return null;
  }

  // 2. 圖片解析邏輯：確保相容 Supabase 中 ["https://..."] 這種字串格式的網址
  const getDisplayImage = (url: any) => {
    const fallback = "/placeholder-logo.png";
    if (!url) return fallback;
    
    // 如果是陣列，取第一個
    if (Array.isArray(url)) return url[0] || fallback;
    
    // 如果是 JSON 字串格式的陣列 (例如 ["http..."])
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
      // 💡 className 加入 z-50 確保卡片在最上層，cursor-pointer 確保滑鼠變手指
      className="relative z-10 block group cursor-pointer no-underline"
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 border border-slate-100 h-full flex flex-col">
        
        {/* 圖片區域：固定比例避免破圖 */}
        <div className="relative aspect-square bg-slate-50 overflow-hidden">
          <img 
            src={getDisplayImage(product.image_url)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
          />
          {/* 分類標籤 */}
          {product.category && (
            <Badge className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-700 border-none shadow-sm font-medium">
              {product.category}
            </Badge>
          )}
        </div>

        {/* 文字資訊區域 */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base mb-1 truncate group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
              {product.description || "點擊查看商品詳細資訊..."}
            </p>
          </div>

          <div className="flex justify-between items-end mt-4">
            <div className="flex flex-col">
              <span className="text-[10px
