"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Menu, Search, Package } from "lucide-react"; // 用於漢堡選單
import Link from "next/link";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        // 抓取已核准 (is_approved: true) 的商品
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_approved", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("抓取列表失敗:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // 解析圖片 (針對你的 age_url 欄位修正)
  const getImageUrl = (item: any) => {
    const url = item.age_url || item.image_url;
    if (!url) return "/placeholder-logo.png";
    if (typeof url === "string" && url.startsWith("[")) {
      try { return JSON.parse(url)[0]; } catch { return url; }
    }
    return url;
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      {/* 1. 漢堡選單導覽列 (還原你原本的功能) */}
      <nav className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <button className="p-1 text-slate-600 hover:text-slate-900">
          <Menu size={24} /> {/* 漢堡選單圖示 */}
        </button>
        <h1 className="text-xl font-bold text-slate-800">STUST 換貨趣</h1>
        <div className="flex gap-1 items-center">
          <Link href="/upload">
             <button className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-full flex items-center gap-1">
                <Package size={16}/>我要上架
             </button>
          </Link>
        </div>
      </nav>

      {/* 搜尋列 (對應截圖中的排版感) */}
      <div className="p-4 mt-2 max-w-7xl mx-auto">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
          <Search className="text-slate-400" size={20}/>
          <input type="text" placeholder="搜尋你要的東西..." className="flex-1 text-sm outline-none" />
          <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium">搜尋</button>
        </div>
      </div>

      {/* 2. 商品列表 (根據截圖樣式) */}
      <div className="p-4 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
        {products.map((product) => (
          /* ✨ 商品卡片結構 (還原截圖樣式) */
          <div key={product.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-3 flex flex-col hover:shadow-md transition-shadow">
            {/* 圖片區域：疊加類別 Badge */}
            <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-3">
              <img 
                src={getImageUrl(product)} 
                alt={product.name} 
                className="w-full h-full object-cover" 
              />
              {/* 類別 Badge (截圖樣式) */}
              {product.category && (
                <div className="absolute top-2.5 left-2.5 bg-white text-slate-800 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-100 shadow-sm">
                  {product.category}
                </div>
              )}
            </div>
            
            {/* 商品名稱與描述 (截圖樣式) */}
            <div className="px-1 flex-grow">
              <h2 className="text-lg font-bold text-slate-800 truncate mb-0.5">{product.name}</h2>
              <p className="text-sm text-slate-400 truncate mb-2">{product.description || product.name}</p>
            </div>

            {/* 價格 (桃紅色) */}
            <p className="px-1 text-2xl font-black text-[#FF385C] mb-3">
              <span className="text-sm font-bold mr-1">NT$</span>{product.price?.toLocaleString()}
            </p>
            
            {/* 下方資訊：日期與連結 (截圖樣式) */}
            <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-[12px] text-slate-400">
              <span className="flex items-center gap-1">📅 5月6日</span>
              {/* ✨ 3. 「查看🔍」連結到 `/products/[id]` */}
              <Link href={`/products/${product.id}`} className="text-[#3B82F6] font-semibold flex items-center gap-0.5">
                查看🔍
              </Link>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-24 text-slate-400 bg-white rounded-3xl border border-slate-100 max-w-3xl mx-auto my-10">目前還沒有商品上架喔！</div>
      )}
    </main>
  );
}
