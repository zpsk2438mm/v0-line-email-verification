"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  MessageCircle, 
  Calendar, 
  Tag
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image"; // 引入 Next.js 的 Image 組件

// 定義商品資料結構
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  contact_info?: string;
  created_at: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProductDetail() {
      try {
        setLoading(true);
        // ✨ 修改重點 1：從資料庫抓取指定的商品，不抓取圖片
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, category, description, contact_info, created_at")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProduct(data);
      } catch (err) {
        console.error("獲取詳情失敗:", err);
        toast.error("無法載入商品詳情");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProductDetail();
  }, [id]);

  // 點擊按鈕複製聯絡資訊
  const handleContact = () => {
    if (!product) return;
    const contact = product.contact_info || "未提供";
    navigator.clipboard.writeText(contact);
    toast.success(`已複製聯絡資訊: ${contact}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  if (!product) return <div className="p-10 text-center">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-20 bg-white px-4 py-3 flex items-center gap-2 border-b shadow-sm">
        <Navigation /> 
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-slate-800 text-sm">商品詳情</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* ✨ 修改重點 2：將圖片區塊替換為你提供的圖片 */}
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border p-4">
          <div className="relative w-full h-full">
            <Image
              src="/image_17.png" // 請將上傳的圖片更名為 image_17.png 並放在 public 資料夾下
              alt="南臺二手交易平臺"
              fill
              className="object-contain" // 保持比例縮放，避免拉伸
              priority // 優先載入此圖片
            />
          </div>
        </div>

        {/* 標題與價格 */}
        <div className="space-y-1">
          <Badge className="bg-orange-50 text-[#D35400] border-none text-[10px] font-bold">
            {product.category || "一般商品"}
          </Badge>
          <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
          <p className="text-3xl font-black text-[#D35400]">NT$ {product.price?.toLocaleString()}</p>
        </div>

        {/* 商品描述 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50/50">
          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3">
            <Tag className="h-3 w-3" /> 商品描述
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {product.description || "賣家很懶，什麼都沒寫..."}
          </p>
          <div className="pt-4 mt-4 border-t border-dashed flex items-center text-[10px] text-slate-400">
            <Calendar className="h-3 w-3 mr-1" /> 
            上架日期: {new Date(product.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* 聯絡賣家按鈕 */}
        <Button 
          className="w-full bg-[#D35400] hover:bg-[#A04000] text-white py-8 rounded-2xl text-lg font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
          onClick={handleContact}
        >
          <div className="flex items-center">
            <MessageCircle className="mr-2 h-6 w-6" />
            聯繫賣家
          </div>
          <span className="text-sm opacity-90 font-medium">
            (複製 LINE ID)
          </span>
        </Button>
      </div>
    </main>
  );
}

// 輔助 Badge 組件
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
