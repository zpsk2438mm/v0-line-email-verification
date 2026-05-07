"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      try {
        setLoading(true);
        // 🔍 嘗試抓取資料
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle(); // 💡 使用 maybeSingle 避免找不到資料時直接噴錯

        if (error) {
          setDebugInfo(`資料庫錯誤: ${error.message}`);
          console.error(error);
        } else if (!data) {
          setDebugInfo("資料庫中找不到這筆 ID 的資料，請確認 ID 是否正確。");
        } else {
          setProduct(data);
        }
      } catch (err: any) {
        setDebugInfo(`執行錯誤: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // 🖼️ 處理您資料庫中的陣列型圖片網址
  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    try {
      const parsed = typeof url === "string" && url.startsWith("[") ? JSON.parse(url) : url;
      return Array.isArray(parsed) ? parsed[0] : url;
    } catch {
      return url;
    }
  };

  if (loading) return <div className="p-10"><Skeleton className="h-64 w-full rounded-3xl" /></div>;

  if (!product) return (
    <div className="p-20 text-center space-y-4">
      <p className="text-slate-500 font-bold">找不到商品</p>
      <p className="text-xs text-rose-400 bg-rose-50 p-2 rounded">查詢 ID: {id}</p>
      {debugInfo && <p className="text-xs text-slate-400">除錯資訊: {debugInfo}</p>}
      <Link href="/"><Button variant="outline">返回首頁</Button></Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-white">
      <header className="p-4 border-b flex items-center gap-2 sticky top-0 bg-white z-50">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <span className="font-bold">商品詳情</span>
      </header>
      <div className="p-4 max-w-md mx-auto space-y-6">
        <div className="aspect-square rounded-3xl overflow-hidden border shadow-sm">
          <img src={getImageUrl(product.image_url)} className="w-full h-full object-cover" alt={product.name} />
        </div>
        <div className="space-y-2">
          <Badge>{product.category}</Badge>
          <h1 className="text-2xl font-bold text-slate-800">{product.name}</h1>
          <p className="text-rose-500 text-2xl font-black">NT$ {product.price}</p>
          <div className="p-5 bg-slate-50 rounded-2xl text-slate-600 text-sm leading-relaxed border border-slate-100">
            {product.description || "暫無描述"}
          </div>
          <div className="mt-6 p-5 bg-blue-600 rounded-2xl text-white shadow-lg">
            <p className="text-xs opacity-70 mb-1">賣家聯絡方式</p>
            <p className="text-xl font-mono font-bold tracking-tighter">{product.contact}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
