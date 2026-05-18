"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { useLiff } from "@/components/liff-provider";
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
  const { isAuthenticated } = useLiff();
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
    if (!url) return "https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/placeholder-logo.png";
    let clean = String(Array.isArray(url) ? url[0] : url).replace(/[\[\]"']/g, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, "")}`;
  };

  // ✨ 修改重點：點擊發送精美的 LINE Flex 訊息卡片
  const handleContact = async () => {
    const contactValue = product?.contact?.trim();
    const productName = product?.name || "未知商品";
    const productPrice = product?.price ? `NT$ ${product.price.toLocaleString()}` : "面議";
    const productImage = getImageUrl(product.image_url || product.images);

    if (!contactValue) {
      toast.error("賣家未提供聯絡資訊");
      return;
    }

    // 🎯 1. 檢查是否在 LINE 環境內
    if (typeof window !== "undefined" && (window as any).liff) {
      const liff = (window as any).liff;
      
      if (liff.isInClient()) {
        try {
          // 發送 LINE Flex Message 泡泡卡片
          await liff.sendMessages([
            {
              type: "flex",
              altText: `🤝 夥伴注意！有人對你的商品【${productName}】感興趣！`,
              contents: {
                type: "bubble",
                hero: {
                  type: "image",
                  url: productImage,
                  size: "full",
                  aspectRatio: "20:13",
                  aspectMode: "cover"
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "md",
                  contents: [
                    {
                      type: "text",
                      text: "🤝 買家感興趣通知",
                      wrap: true,
                      weight: "bold",
                      color: "#D35400",
                      size: "md"
                    },
                    {
                      type: "text",
                      text: productName,
                      wrap: true,
                      weight: "bold",
                      size: "xl",
                      margin: "sm"
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      margin: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "商品價格：",
                          color: "#aaaaaa",
                          size: "sm",
                          flex: 2
                        },
                        {
                          type: "text",
                          text: productPrice,
                          wrap: true,
                          color: "#D35400",
                          size: "md",
                          weight: "bold",
                          flex: 5
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      contents: [
                        {
                          type: "text",
                          text: "賣家 ID：",
                          color: "#aaaaaa",
                          size: "sm",
                          flex: 2
                        },
                        {
                          type: "text",
                          text: contactValue,
                          wrap: true,
                          color: "#333333",
                          size: "sm",
                          weight: "bold",
                          flex: 5
                        }
                      ]
                    },
                    {
                      type: "separator",
                      margin: "lg"
                    },
                    {
                      type: "text",
                      text: "請賣家與買家雙方直接在此聊天室內聯繫，確認後續的交貨與付款細節喔！",
                      wrap: true,
                      color: "#777777",
                      size: "xs",
                      margin: "md"
                    }
                  ]
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "南臺二手市集 · 媒合系統",
                      size: "xs",
                      color: "#aaaaaa",
                      align: "center"
                    }
                  ]
                }
              }
            }
          ]);
          
          toast.success("已發送聯絡卡片！");
          
          // 發送完畢後自動關閉網頁回到聊天室
          setTimeout(() => {
            liff.closeWindow();
          }, 800);
          return;
        } catch (error) {
          console.error("Flex 卡片發送失敗:", error);
          toast.error("發送失敗，改為複製 ID");
        }
      }
    }

    // 🎯 2. 一般瀏覽器安全回退機制 (複製並彈窗)
    try {
      await navigator.clipboard.writeText(contactValue);
      toast.success(`已自動複製賣家 LINE ID: ${contactValue}`);
      alert(`賣家 LINE ID: ${contactValue}\n(已自動複製)`);
    } catch (e) {
      toast.error("複製失敗，請手動抄錄");
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
        >
          <div className="flex items-center text-lg">
            <MessageCircle className="mr-2 h-6 w-6" />
            聯繫賣家 (送出卡片)
          </div>
          <div className="text-sm opacity-90 font-medium">
            ({product.contact || "未提供 ID"})
          </div>
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
