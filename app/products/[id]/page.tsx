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
import { useLiff } from "@/components/liff-provider";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { lineUserId, login, isLiffInit } = useLiff();
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

  // ✨ 修改重點：點擊按鈕，直接送出 API 觸發後端對賣家的 LINE 推播
  const handleContact = async () => {
    if (!isLiffInit) return;
    if (!lineUserId) {
      toast.error("請先使用 LINE 登入，才能聯繫賣家");
      login();
      return;
    }
    // 從 products 資料表中抓取賣家的 line_user_id (對應後端解析的欄位)
    const sellerLineUserId = product?.line_user_id || product?.lineUserId; 
    const contactValue = product?.contact;

    if (!sellerLineUserId) {
      toast.error("系統找不到該賣家的 LINE 帳號資料，無法發送通知");
      return;
    }

    try {
      setSendingNotify(true);

      // 先貼心幫買家把聯絡資訊（比如 LINE ID）複製起來
      // 聯絡資料只在登入後提供，複製失敗不影響通知
      if (contactValue && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contactValue).catch(() => {});
      }

      // 🎯 呼叫後端 API 傳送聯絡通知
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "contact_seller",           // 觸發新寫的通知卡片類型
          line_user_id: sellerLineUserId,     // 賣家的 LINE 識別碼 
          name: product.name,
          price: product.price,
          image_url: product.image_url || product.images
        }),
      });

      if (!res.ok) {
        throw new Error("API 發送失敗");
      }

      toast.success("已成功發送 LINE 通知給賣家！");
      alert(`🎉 系統已成功對賣家發送 LINE 通知！\n\n同時已為您自動複製賣家聯絡資訊：${contactValue || "無"}\n您可以去 LINE 搜尋與賣家聯絡囉！`);

    } catch (error) {
      console.error("發送通知失敗:", error);
      toast.error("發送 LINE 通知失敗");
      if (contactValue) {
        alert(`通知發送失敗，但已為您複製賣家聯絡資訊：${contactValue}`);
      }
    } finally {
      setSendingNotify(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  if (!product) return <div className="p-10 text-center">找不到該商品</div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">
      <div className="sticky top-0 z-20 bg-white px-4 py-3 flex items-center gap-1 border-b shadow-sm">
        <Navigation /> 
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9">
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <h1 className="font-bold text-slate-800 text-sm ml-1">商品詳情</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-orange-50">
          <img
            src={getImageUrl(product.image_url || product.images)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
          />
        </div>

        <div className="space-y-1">
          <Badge className="bg-orange-100 text-[#D35400] border-none text-[10px] font-bold px-2 py-0.5 rounded-md">
            {product.category || "一般商品"}
          </Badge>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{product.name}</h2>
          <p className="text-3xl font-black text-[#D35400]">NT$ {product.price?.toLocaleString()}</p>
        </div>

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
          className="w-full bg-[#D35400] hover:bg-[#A04000] text-white py-10 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
          onClick={handleContact}
          disabled={sendingNotify || !isLiffInit}
        >
          {sendingNotify ? (
            <>
              <Loader2 className="animate-spin h-6 w-6" />
              <div className="text-lg">正在發送通知...</div>
            </>
          ) : (
            <>
              <div className="flex items-center text-lg">
                <MessageCircle className="mr-2 h-6 w-6" />
                聯繫賣家 (發送 LINE 通知)
              </div>
              <div className="text-sm opacity-90 font-medium">
                {lineUserId ? (product.contact || "未提供 ID") : "請先使用 LINE 登入"}
              </div>
            </>
          )}
        </Button>
      </div>
    </main>
  );
}

// 🎯 本地直接宣告 Badge 組件，徹底絕緣元件找不到導致的白屏錯誤
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
