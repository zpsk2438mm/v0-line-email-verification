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
  Tag,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🎯 控制自訂 LINE 通知彈窗的狀態
  const [isAlertOpen, setIsAlertOpen] = useState(false);

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

  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    let clean = String(Array.isArray(url) ? url[0] : url).replace(/[\[\]"']/g, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
  };

  // ✨ 點擊按鈕：複製 ID 並打開「乾淨無網址」的自訂對話框
  const handleContact = async () => {
    const contactValue = product?.contact?.trim();

    if (!contactValue) {
      toast.error("賣家未提供聯絡資訊");
      return;
    }

    try {
      // 執行複製
      await navigator.clipboard.writeText(contactValue);
      toast.success("已自動複製賣家 LINE ID");
      
      // 🎯 開啟客製化彈窗（取代會顯示網址的原生 alert）
      setIsAlertOpen(true);
    } catch (e) {
      // 備用方案：如果複製失敗，依然顯示彈窗讓使用者可以看著抄
      setIsAlertOpen(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  if (!product) return <div className="p-10 text-center">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10 relative">
      {/* 頂部導航 */}
      <div className="sticky top-0 z-20 bg-white px-4 py-3 flex items-center gap-1 border-b shadow-sm">
        <Navigation /> 
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <h1 className="font-bold text-slate-800 text-sm ml-1">商品詳情</h1>
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

        {/* 標題與價格 */}
        <div className="space-y-1">
          <Badge className="bg-orange-100 text-[#D35400] border-none text-[10px] font-bold px-2 py-0.5 rounded-md">
            {product.category || "一般商品"}
          </Badge>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{product.name}</h2>
          <p className="text-3xl font-black text-[#D35400]">NT$ {product.price?.toLocaleString()}</p>
        </div>

        {/* 商品描述區塊 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50/50">
          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3 tracking-wider">
            <Tag className="h-3.5 w-3.5" /> 商品描述
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            {product.description || "賣家很懶，什麼都沒寫..."}
          </p>
          <div className="pt-4 mt-4 border-t border-dashed flex items-center text-[10px] text-slate-400">
            <Calendar className="h-3 w-3 mr-1.5" /> 
            上架日期: {new Date(product.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* 聯繫賣家按鈕 */}
        <Button 
          className="w-full bg-[#D35400] hover:bg-[#A04000] text-white py-7 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
          onClick={handleContact}
        >
          <div className="flex items-center text-base">
            <MessageCircle className="mr-2 h-5 w-5" />
            聯繫賣家
          </div>
          <div className="text-xs opacity-90 font-medium">
            ({product.contact || "未提供 ID"})
          </div>
        </Button>
      </div>

      {/* 🎯 ✨ 這裡就是客製化的 LINE 通知對話框（完全沒有網址字樣） */}
      {isAlertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          {/* 背景遮罩層 */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsAlertOpen(false)} 
          />
          
          {/* 彈窗主體：仿造原生對話框但更精美、乾淨 */}
          <div className="relative bg-[#1E1E1E] text-white w-full max-w-xs rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden transform scale-100 transition-all duration-200 p-5 space-y-4">
            
            {/* 內容區 */}
            <div className="text-center py-2">
              <p className="text-zinc-200 font-medium text-base leading-snug">
                賣家 LINE ID: <span className="text-orange-400 font-bold select-all bg-zinc-800/50 px-2 py-0.5 rounded mx-1">{product?.contact}</span>
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                (已自動複製，可至 LINE 搜尋加好友)
              </p>
            </div>

            {/* 按鈕區 */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                className="w-full py-2.5 text-center text-sm font-semibold text-sky-400 hover:text-sky-300 active:bg-zinc-800/50 rounded-xl transition-colors"
                onClick={() => setIsAlertOpen(false)}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
