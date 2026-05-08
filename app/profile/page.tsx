"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertCircle, CheckCircle2, Clock3, LogIn } from "lucide-react";

export default function ProfilePage() {
  const { lineUserId, isAuthenticated, liff, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 圖片網址解析
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
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (err) {
      console.error("抓取個人商品失敗:", err);
    } finally {
      setLoading(false);
    }
  }

  // 刪除功能 (使用者可以刪除自己的商品)
  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此商品嗎？")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("刪除失敗");
    else fetchMyProducts();
  }

  // 1. 加載中狀態
  if (liffLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-10 w-10 text-orange-500" />
      </div>
    );
  }

  // 2. 未登入狀態 (解決個人中心不見的問題)
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] pb-24">
        <header className="p-6"><Navigation /></header>
        <div className="flex flex-col items-center justify-center p-10 text-center mt-20">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">尚未登入</h1>
          <p className="text-gray-500 mb-8">登入後即可查看您的商品與審核進度</p>
          <Button 
            onClick={() => liff?.login()}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl px-12 h-14 text-lg font-bold shadow-lg shadow-orange-100"
          >
            LINE 登入
          </Button>
        </div>
      </main>
    );
  }

  // 3. 已登入，顯示商品列表
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24 text-slate-800">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-5 flex items-center gap-3">
        <Navigation />
        <h1 className="font-black text-xl tracking-tight">我的商品</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {loading ? (
           <div className="py-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-orange-500" /></div>
        ) : myProducts.length === 0 ? (
          <div className="py-24 text-center text-gray-400 flex flex-col items-center gap-3">
            <Package className="w-16 h-16 opacity-10" />
            <p className="text-lg">尚無上傳紀錄</p>
          </div>
        ) : (
          myProducts.map((product) => (
            <Card key={product.id} className="border-none shadow-xl rounded-[32px] bg-white overflow-hidden p-6">
              <div className="flex gap-5">
                {/* 圖片 */}
                <div className="w-28 h-28 bg-gray-50 rounded-[24px] overflow-hidden shrink-0 border border-gray-100 shadow-inner">
                  <img 
                    src={getImageUrl(product.image_url)} 
                    className="w-full h-full object-cover"
                    alt={product.name}
                    onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                  />
                </div>

                {/* 資訊 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold truncate text-slate-900">{product.name}</h3>
                      <p className="text-orange-600 font-black text-xl">NT$ {product.price}</p>
                    </div>
                    
                    {/* 狀態標籤 */}
                    {product.status === 'approved' && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 py-1 rounded-lg flex gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 已上架
                      </Badge>
                    )}
                    {product.status === 'pending' && (
                      <Badge className="bg-orange-50 text-orange-600 border-none px-2 py-1 rounded-lg flex gap-1">
                        <Clock3 className="w-3 h-3" /> 審核中
                      </Badge>
                    )}
                    {product.status === 'rejected' && (
                      <Badge className="bg-rose-50 text-rose-600 border-none px-2 py-1 rounded-lg flex gap-1">
                        <AlertCircle className="w-3 h-3" /> 已退回
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-end justify-between mt-2">
                    <span className="text-[10px] text-gray-300">
                      {new Date(product.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-rose-500 text-xs font-bold flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      🗑️ 刪除商品
                    </button>
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
