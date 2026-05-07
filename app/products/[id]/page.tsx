"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, MessageCircle, Package } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  contact: string;
  image_url: any; // 使用 any 處理資料庫中的複雜格式
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id; // 👈 取得 URL 中的 ID
  const [product, setProduct] = useState<Product | null>(null);
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

  // 🖼️ 處理圖片邏輯 (相容資料庫中的格式)
  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    if (Array.isArray(url)) return url[0];
    if (typeof url === "string" && url.startsWith("[")) {
      try { return JSON.parse(url)[0]; } catch { return url; }
    }
    return url;
  };

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;
  if (!product) return <div className="p-20 text-center">商品不存在</div>;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="p-4 flex items-center gap-2 bg-white border-b">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="font-bold truncate">{product.name}</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="aspect-square rounded-3xl overflow-hidden border bg-white">
          <img src={getImageUrl(product.image_url)} className="w-full h-full object-cover" alt={product.name} />
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <Badge className="mb-2">{product.category}</Badge>
          <h2 className="text-2xl font-black">{product.name}</h2>
          <p className="text-rose-500 text-xl font-bold mt-2">NT$ {product.price?.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t text-slate-600 text-sm whitespace-pre-wrap">
            {product.description || "無描述"}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-3xl">
          <p className="text-blue-400 font-bold mb-2">聯絡方式</p>
          <p className="text-lg font-mono">{product.contact || "未提供"}</p>
        </div>
      </div>
    </main>
  );
}
