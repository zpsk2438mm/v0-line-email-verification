"use client";

import { useEffect, useState, use } from "react"; // 👈 務必引入 use
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 👈 這是 Next.js 最新版最安全的抓取 ID 方式
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

  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    if (Array.isArray(url)) return url[0];
    if (typeof url === "string" && url.startsWith("[")) {
      try { return JSON.parse(url)[0]; } catch { return url; }
    }
    return url;
  };

  if (loading) return <div className="p-10"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!product) return <div className="p-20 text-center text-slate-500">找不到商品 (ID: {id})</div>;

  return (
    <main className="min-h-screen bg-white">
      <header className="p-4 border-b flex items-center gap-2">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <span className="font-bold">商品詳情</span>
      </header>
      <div className="p-4 max-w-md mx-auto space-y-6">
        <div className="aspect-square rounded-3xl overflow-hidden border">
          <img src={getImageUrl(product.image_url)} className="w-full h-full object-cover" />
        </div>
        <div className="space-y-2">
          <Badge>{product.category}</Badge>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-rose-500 text-xl font-black font-mono text-right">NT$ {product.price}</p>
          <div className="p-4 bg-slate-50 rounded-2xl text-slate-600 text-sm leading-relaxed">
            {product.description}
          </div>
          <div className="mt-6 p-4 bg-blue-600 rounded-2xl text-white text-center">
            <p className="text-xs opacity-80 mb-1">聯絡賣家</p>
            <p className="text-lg font-bold">{product.contact}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
