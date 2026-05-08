"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

// 管理員 LINE ID 
const ADMIN_IDS = ["Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 解析完整網址的邏輯
  const getImageUrl = (raw: any) => {
    if (!raw) return "/placeholder-logo.png";
    try {
      let url = "";
      if (Array.isArray(raw)) {
        url = raw[0];
      } else if (typeof raw === 'string' && raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        url = Array.isArray(parsed) ? parsed[0] : raw;
      } else {
        url = raw;
      }
      return url.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim() || "/placeholder-logo.png";
    } catch (e) {
      return "/placeholder-logo.png";
    }
  };

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId && ADMIN_IDS.includes(lineUserId)) {
      fetchData();
    } else if (!liffLoading) {
      setLoading(false);
    }
  }, [liffLoading, isAuthenticated, lineUserId]);

  async function fetchData() {
    setLoading(true);
    // 🔍 重點：只抓取狀態為 'pending' 的商品
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "pending") 
      .order("created_at", { ascending: false });

    if (!error) {
      setPendingProducts(data || []);
    }
    setLoading(false);
  }

  // ✅ 准許上架
  async function handleApprove(id: string) {
    setProcessingId(id);
    const { error } = await supabase
      .from("products")
      .update({ 
        is_approved: true, 
        status: 'approved' 
      })
      .eq("id", id);
    
    if (error) {
      alert("核准失敗");
    } else {
      // 從 UI 移除該卡片
      setPendingProducts(prev => prev.filter(p => p.id !== id));
    }
    setProcessingId(null);
  }

  // ❌ 退回 (不刪除，僅更改狀態)
  async function handleReject(id: string) {
    setProcessingId(id);
    const { error } = await supabase
      .from("products")
      .update({ 
        status: 'rejected',
        is_approved: false 
      })
      .eq("id", id);
    
    if (error) {
      alert("操作失敗");
    } else {
      // 從 UI 移除該卡片
      setPendingProducts(prev => prev.filter(p => p.id !== id));
    }
    setProcessingId(null);
  }

  if (liffLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-10 w-10 text-orange-500" />
      </div>
    );
  }

  if (!lineUserId || !ADMIN_IDS.includes(lineUserId)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">權限不足</h1>
        <p className="text-gray-500">您的 ID: {lineUserId}</p>
        <Button asChild className="mt-6 bg-orange-600 text-white rounded-xl"><a href="/">回首頁</a></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24 text-slate-800 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Navigation />
          <ShieldCheck className="text-orange-500 w-6 h-6" />
          <h1 className="font-black text-xl tracking-tight">待審核 ({pendingProducts.length})</h1>
        </div>
        <Button onClick={fetchData} variant="ghost" className="text-orange-600 font-bold hover:bg-orange-50">刷新</Button>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {pendingProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-medium">✨ 目前沒有待審核項目</div>
        ) : (
          pendingProducts.map((product) => (
            <Card key={product.id} className="border-none shadow-2xl rounded-[40px] bg-white overflow-hidden">
              <div className="p-7">
                <div className="flex gap-6 mb-8 text-left">
                  <div className="w-32 h-32 bg-gray-50 rounded-[32px] overflow-hidden shrink-0 border border-gray-100 shadow-inner">
                    <img 
                      src={getImageUrl(product.image_url)} 
                      className="w-full h-full object-cover"
                      alt="Product"
                      onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <Badge className="w-fit bg-orange-50 text-orange-700 border-none mb-2 px-3 py-1 rounded-full text-xs font-bold">
                      {product.category}
                    </Badge>
                    <h3 className="text-xl font-bold text-slate-900 truncate mb-1">{product.name}</h3>
                    <p className="text-2xl font-black text-orange-600">NT$ {product.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    disabled={!!processingId}
                    className="flex-[2] bg-[#00E000] hover:bg-[#00CC00] text-white h-16 rounded-[24px] text-lg font-black shadow-lg shadow-green-100 transition-transform active:scale-95"
                  >
                    {processingId === product.id ? <Loader2 className="animate-spin" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleReject(product.id)}
                    disabled={!!processingId}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 h-16 rounded-[24px] font-bold transition-transform active:scale-95"
                  >
                    退回
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
