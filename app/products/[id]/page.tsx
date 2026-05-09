"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation"; // 引入漢堡選單
import { 
  Loader2, 
  ChevronLeft, 
  MessageCircle, 
  Calendar, 
  Tag, 
  ClipboardCheck 
} from "lucide-react";
import { toast } from "sonner";

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

  const getImageUrl = (url: any) => {
    if (!url) return "/placeholder-logo.png";
    let clean = String(Array.isArray(url) ? url[0] : url).replace(/[\[\]"']/g, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
  };

  // 處理聯繫功能：點擊後複製 LINE ID 並提示
  const handleContact = () => {
    const contact = product.contact_info || product.line_id || "未提供聯絡方式";
    
    // 嘗試複製到剪貼簿
    navigator.clipboard.writeText(contact);
    
    // 使用彈窗或 Toast 提示
    alert(`賣家聯絡資訊：${contact}\n(已自動複製到剪貼簿)`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin text-[#D35400]" />
      </div>
    );
  }

  if (!product) return <div className="p-10 text-center">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">
      {/* 頂部導航：包含漢堡選單與返回鍵 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Navigation /> {/* 🍔 左上角漢堡選單 */}
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-slate-700 text-sm">商品詳情</span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* 商品圖片 */}
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-md border border-orange-50">
          <img
            src={getImageUrl(product.image_url || product.images)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
          />
        </div>

        {/* 商品資訊 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-[#D35400] text-[10px] font-bold px-2 py-0.5 rounded-md">
              {product.category || "一般商品"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800">{product.name}</h2>
          <p className="text-3xl font-black text-[#D35400]">NT$ {product.price?.toLocaleString()}</p>
        </div>

        {/* 描述區塊 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-orange-50/50">
          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <Tag className="h-3 w-3" /> 商品描述
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {product.description || "賣家很懶，什麼都沒寫..."}
          </p>
          <div className="pt-3 border-t border-dashed flex items-center text-[10px] text-slate-400">
            <Calendar className="h-3 w-3 mr-1" /> 
            刊登日期: {new Date(product.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* 聯繫賣家按鈕：抓取資料庫中的聯絡資訊 */}
        <Button 
          className="w-full bg-[#D35400] hover:bg-[#A04000] text-white py-8 rounded-2xl text-lg font-bold shadow-lg transition-all active:scale-95"
          onClick={handleContact}
        >
          <MessageCircle className="mr-2 h-6 w-6" />
          聯繫賣家 ({product.contact_info || "查看 LINE ID"})
        </Button>
      </div>
    </main>
  );
}
