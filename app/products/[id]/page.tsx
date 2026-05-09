"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, MessageCircle, Calendar, Tag } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProductDetail() {
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
        console.error("獲取詳情失敗:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProductDetail();
  }, [id]);

  // 處理圖片顯示邏輯
  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    let clean = String(Array.isArray(url) ? url[0] : url).replace(/[\[\]"']/g, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin text-[#D35400]" />
      </div>
    );
  }

  if (!product) {
    return <div className="p-10 text-center">找不到該商品</div>;
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center gap-2 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="font-bold text-slate-800">商品詳情</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* 商品圖片 */}
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-orange-50">
          <img
            src={getImageUrl(product.image_url || product.images)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
          />
        </div>

        {/* 商品資訊 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-[#D35400] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {product.category || "其他"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{product.name}</h2>
          <p className="text-3xl font-black text-[#D35400]">NT$ {product.price?.toLocaleString()}</p>
        </div>

        {/* 描述區塊 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-orange-50/50">
          <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Tag className="h-4 w-4" /> 商品描述
          </h3>
          <p className="text-slate-600 leading-relaxed">
            {product.description || "賣家很懶，什麼都沒寫..."}
          </p>
          <div className="pt-3 border-t border-dashed flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> 上架日期: {new Date(product.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* 聯絡按鈕 */}
        <Button 
          className="w-full bg-[#D35400] hover:bg-[#E67E22] text-white py-8 rounded-2xl text-lg font-bold shadow-lg shadow-orange-100 transition-all active:scale-95"
          onClick={() => {
            // 這裡未來可以串接 LINE 聊天或是私訊功能
            alert("即將開啟聯絡功能！");
          }}
        >
          <MessageCircle className="mr-2 h-6 w-6" />
          聯繫賣家
        </Button>
      </div>
    </main>
  );
}
