"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";

export default function ProfilePage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 圖片網址解析 (與管理員頁面一致)
  const getImageUrl = (raw: any) => {
    if (!raw) return "/placeholder-logo.png";
    try {
      let url = Array.isArray(raw) ? raw[0] : (typeof raw === 'string' && raw.startsWith('[') ? JSON.parse(raw)[0] : raw);
      return url.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim() || "/placeholder-logo.png";
    } catch (e) { return "/placeholder-logo.png"; }
  };

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      fetchMyProducts();
    } else if (!liffLoading) {
      setLoading(false);
    }
  }, [liffLoading, isAuthenticated, lineUserId]);

  async function fetchMyProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", lineUserId) // 確保只抓自己的商品
      .order("created_at", { ascending: false });

    if (!error) setMyProducts(data || []);
    setLoading(false);
  }

  if (liffLoading || loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin h-10 w-10 text-orange-500" /></div>;

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <Navigation />
          <h1 className="font-black text-xl tracking-tight text-slate-800">我的商品</h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {myProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2">
            <Package className="w-12 h-12 opacity-20" />
            <p>還沒有上傳過商品喔</p>
          </div>
        ) : (
          myProducts.map((product) => (
            <Card key={product.id} className="border-none shadow-lg rounded-3xl bg-white overflow-hidden">
              <div className="p-5 flex gap-4">
                {/* 商品圖片 */}
                <div className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                  <img 
                    src={getImageUrl(product.image_url)} 
                    className="w-full h-full object-cover"
                    alt={product.name}
                  />
                </div>

                {/* 商品資訊 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                      <p className="font-black text-orange-600 ml-2 text-sm">NT${product.price}</p>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">{product.description}</p>
                  </div>

                  {/* 🚀 狀態標籤顯示區域 */}
                  <div className="flex items-center gap-2 mt-2">
                    {product.status === 'approved' && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none shadow-none flex gap-1 items-center px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> 已上架
                      </Badge>
                    )}
                    
                    {product.status === 'pending' && (
                      <Badge className="bg-orange-50 text-orange-600 border-none shadow-none flex gap-1 items-center px-2 py-0.5">
                        <Clock3 className="w-3 h-3" /> 審核中
                      </Badge>
                    )}
                    
                    {product.status === 'rejected' && (
                      <Badge className="bg-rose-50 text-rose-600 border-none shadow-none flex gap-1 items-center px-2 py-0.5">
                        <AlertCircle className="w-3 h-3" /> 已退回
                      </Badge>
                    )}
                    
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {new Date(product.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
