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

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingNotify, setSendingNotify] = useState(false);

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

  // ✨ 重點：呼叫後端 API 發送 LINE 訊息通知賣家
  const handleContact = async () => {
    // 這裡的 product.user_id 或是 product.seller_line_id 必須是賣家的 LINE UID (例如 Uf7c4668bc...)
    // 請根據你的資料庫欄位名稱調整，這裡假設你存在 product.contact 或對應的識別碼中
    const sellerLineUid = product?.contact?.trim(); 
    const productName = product?.name || "未知商品";
    const productPrice = product?.price || 0;

    if (!sellerLineUid) {
      toast.error("找不到賣家的 LINE 帳號資訊，無法發送通知");
      return;
    }

    try {
      setSendingNotify(true);
      
      // 🎯 呼叫我們剛剛寫好的 /api/notify 路由
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerLineId: sellerLineUid, // 賣家的 LINE UID
          productName: productName,
          productPrice: productPrice,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("已成功發送 LINE 通知給賣家！");
        alert("🎉 已發送 LINE 訊息通知賣家囉！請靜待賣家與您聯繫。");
      } else {
        throw new Error(result.error || "發送失敗");
      }
    } catch (error: any) {
      console.error("發送 LINE 通知失敗:", error);
      toast.error(`通知發送失敗: ${error.message}`);
      // 備用方案：如果通知發送失敗，至少提示目前的聯絡資訊
      alert(`無法發送 LINE 通知。賣家聯絡資訊為: ${sellerLineUid}`);
    } finally {
      setSendingNotify(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  if (!product) return <div className="p-10 text-center">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">
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

        {/* 商品描述 */}
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
          className="w-full bg-[#D35400] hover:bg-[#A04000] text-white py-7 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          onClick={handleContact}
          disabled={sendingNotify}
        >
          {sendingNotify ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              正在發送 LINE 通知...
            </>
          ) : (
            <>
              <MessageCircle className="h-5 w-5" />
              發送 LINE 通知聯繫賣家
            </>
          )}
        </Button>
      </div>
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
