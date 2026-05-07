"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

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
          .maybeSingle();

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

  // 🖼️ 圖片解析邏輯 (適配你的 age_url 欄位)
  const getImageUrl = (item: any) => {
    const url = item?.age_url || item?.image_url;
    if (!url) return "/placeholder-logo.png";
    try {
      const parsed = (typeof url === "string" && url.startsWith("[")) ? JSON.parse(url) : url;
      return Array.isArray(parsed) ? parsed[0] : url;
    } catch {
      return url;
    }
  };

  if (loading) return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center">
      <p className="text-slate-400 mb-4">找不到該商品資訊</p>
      <Link href="/"><Button variant="outline">回首頁</Button></Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-white pb-24">
      {/* 頂部導覽 */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-100">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-100">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* 商品大圖 */}
        <div className="aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border border-slate-50">
          <img 
            src={getImageUrl(product)} 
            className="w-full h-full object-cover" 
            alt={product.name} 
          />
        </div>

        {/* 商品主資訊 */}
        <div className="space-y-3 px-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-900 text-white hover:bg-slate-900 rounded-lg px-3">
              {product.category || "二手精品"}
            </Badge>
            {product.is_approved && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                已認證
              </Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {product.name}
          </h1>
          
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-rose-500">NT$</span>
            <span className="text-4xl font-black text-rose-500">
              {product.price?.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 商品描述區塊 */}
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">商品描述</h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {product.description || "賣家暫時沒有提供詳細描述喔！如果有興趣歡迎直接私訊詢問。"}
          </p>
        </div>

        {/* 底部固定聯絡按鈕 */}
        <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase ml-1 mb-0.5">聯絡賣家</p>
              <p className="text-white font-mono text-sm truncate ml-1">
                {product.contact || product.verified_email || "私訊了解更多"}
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-6 h-auto font-bold shrink-0">
              <MessageCircle className="w-5 h-5 mr-2" />
              立即私訊
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
