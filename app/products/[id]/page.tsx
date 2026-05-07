"use client";

import { useEffect, useState, use } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// 💡 必須正確定義 Props 類型以符合 Next.js 路由規範
export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 使用 use() 非同步處理 params，這是解決 404 的核心
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id) // 使用從 URL 抓到的 id
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-10 w-1/2" /></div>;
  if (!product) return <div className="p-20 text-center">找不到商品 (ID: {id})</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <header className="p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-50">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="font-bold truncate">{product.name}</h1>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="aspect-square rounded-3xl overflow-hidden bg-white border shadow-sm">
          <img 
            src={Array.isArray(product.image_url) ? product.image_url[0] : product.image_url} 
            className="w-full h-full object-cover"
            alt={product.name}
          />
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm space-y-3">
          <Badge variant="secondary">{product.category}</Badge>
          <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
          <p className="text-rose-500 text-2xl font-black">NT$ {product.price}</p>
          <div className="h-px bg-slate-100 my-4" />
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {product.description}
          </p>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
          <p className="text-blue-400 font-bold text-xs mb-1">賣家聯絡方式</p>
          <p className="text-lg font-mono">{product.contact || "未提供"}</p>
        </div>
      </div>
    </main>
  );
}
