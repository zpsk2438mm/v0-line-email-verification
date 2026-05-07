"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error("抓取失敗:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // 🖼️ 針對你的資料庫格式優化的圖片解析
  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    
    // 如果是真正的陣列
    if (Array.isArray(url)) return url[0];
    
    // 如果是看起來像陣列的字串 ["http..."]
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

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!product) return <div className="p-20 text-center">找不到商品 (ID: {id})</div>;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-50">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="font-bold truncate">{product.name}</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 商品圖片 */}
        <div className="aspect-square rounded-3xl overflow-hidden border bg-white shadow-sm">
          <img 
            src={getImageUrl(product.image_url)} 
            className="w-full h-full object-cover" 
            alt={product.name} 
          />
        </div>
        
        {/* 商品資訊 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <Badge>{product.category}</Badge>
            <span className="text-[10px] text-slate-400">ID: {product.id?.slice(0,8)}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
          <p className="text-rose-500 text-2xl font-bold mt-2">NT$ {product.price?.toLocaleString()}</p>
          
          <div className="mt-4 pt-4 border-t text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
            {product.description || "賣家很懶，還沒寫描述～"}
          </div>
        </div>

        {/* 聯絡賣家區塊 */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-400 font-bold text-sm">聯絡方式</p>
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
          </div>
          <p className="text-xl font-mono tracking-wider">{product.contact || "未提供"}</p>
          <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 rounded-xl py-6">
            立即私訊
          </Button>
        </div>
      </div>
    </main>
  );
}
