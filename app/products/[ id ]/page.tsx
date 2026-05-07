"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, MessageCircle, Tag, Calendar, User, Package } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  contact: string;
  image_url: string | string[] | null;
  created_at: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error("抓取商品詳情失敗:", err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProduct();
  }, [id]);

  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    if (Array.isArray(url)) return url[0];
    if (typeof url === "string" && url.startsWith("[")) {
      try { return JSON.parse(url)[0]; } catch { return "/placeholder-logo.png"; }
    }
    return url;
  };

  if (loading) return <div className="p-8 text-center"><Skeleton className="h-[400px] w-full max-w-2xl mx-auto rounded-3xl" /></div>;
  if (!product) return <div className="p-20 text-center text-slate-500">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white/80 backdrop-blur-md px-4 py-4 shadow-sm">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold truncate">{product.name}</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 圖片展示 */}
        <div className="aspect-square rounded-3xl overflow-hidden border bg-white shadow-sm">
          <img 
            src={getImageUrl(product.image_url)} 
            className="w-full h-full object-cover" 
            alt={product.name}
          />
        </div>

        {/* 基本資訊 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <Badge className="mb-2 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">{product.category}</Badge>
              <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
            </div>
            <p className="text-2xl font-black text-rose-500 underline decoration-rose-200">NT$ {product.price.toLocaleString()}</p>
          </div>

          <div className="pt-4 border-t border-slate-50 space-y-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><Package className="h-4 w-4" /> 商品描述</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{product.description || "賣家很懶，什麼都沒寫..."}</p>
          </div>
        </div>

        {/* 聯絡資訊卡片 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-lg space-y-4">
          <h3 className="font-bold flex items-center gap-2 text-blue-400"><MessageCircle className="h-5 w-5" /> 賣家聯絡方式</h3>
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <p className="text-lg font-mono tracking-wider text-center">{product.contact || "未提供聯絡資訊"}</p>
          </div>
          <p className="text-[10px] text-slate-400 text-center italic">提醒：交易前請務必確認商品狀況，建議於校內面交。</p>
        </div>
      </div>
    </main>
  );
}
