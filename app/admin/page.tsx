"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

// 🛡️ 只有你的 ID 可以進入
const ADMIN_IDS = ["Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 核心：解析完整網址
  const getImageUrl = (raw: any) => {
    if (!raw) return "/placeholder-logo.png";
    
    try {
      let url = "";
      
      // 情況 A：如果是陣列格式 ["http..."]
      if (Array.isArray(raw)) {
        url = raw[0];
      } 
      // 情況 B：如果是字串格式的陣列 '["http..."]'
      else if (typeof raw === 'string' && raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        url = Array.isArray(parsed) ? parsed[0] : raw;
      } 
      // 情況 C：一般字串
      else {
        url = raw;
      }

      // 移除所有可能殘留的引號、中括號及反斜線
      const cleanUrl = url.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim();
      
      return cleanUrl || "/placeholder-logo.png";
    } catch (e) {
      console.error("解析網址出錯:", e);
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
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingProducts(data || []);
    } catch (err) {
      console.error("抓取失敗:", err);
    } finally {
      setLoading(false);
    }
  }

  // 核准功能
  async function handleApprove(id: string) {
    const { error } = await supabase.from("products").update({ is_approved: true }).eq("id", id);
    if (error) alert("操作失敗");
    else fetchData();
  }

  // 刪除功能
  async function handleDelete(id: string) {
    if (!confirm("確定要拒絕並刪除此商品嗎？")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("刪除失敗");
    else fetchData();
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
        <p className="text-gray-500 mb-6">您的 ID: {lineUserId || "未偵測"}</p>
        <Button asChild className="bg-orange-600 text-white rounded-xl px-8 h-12"><a href="/">回首頁</a></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation />
          <ShieldCheck className="text-slate-800" />
          <h1 className="font-bold text-lg">待審核 ({pendingProducts.length})</h1>
        </div>
        <Button onClick={fetchData} variant="ghost" className="text-orange-600 font-bold">刷新</Button>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {pendingProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400">目前沒有待審核項目</div>
        ) : (
          pendingProducts.map((product) => (
            <Card key={product.id} className="border-none shadow-xl rounded-[32px] bg-white overflow-hidden">
              <div className="p-6">
                <div className="flex gap-5 mb-6 text-left">
                  <div className="w-28 h-28 bg-gray-100 rounded-3xl overflow-hidden shrink-0 border border-gray-100 shadow-inner">
                    <img 
                      src={getImageUrl(product.image_url)} 
                      className="w-full h-full object-cover"
                      alt="Product"
                      onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge className="bg-orange-100 text-orange-700 border-none mb-1 text-[10px]">
                      {product.category}
                    </Badge>
                    <h3 className="text-lg font-bold text-slate-800 truncate">{product.name}</h3>
                    <p className="text-2xl font-black text-orange-600 mt-1">NT$ {product.price}</p>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1 italic">{product.description}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    className="flex-[2] bg-[#00E000] hover:bg-[#00CC00] text-white h-14 rounded-2xl text-lg font-bold shadow-lg shadow-green-100"
                  >
                    准許上架
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 bg-rose-50 text-rose-500 h-14 rounded-2xl font-bold"
                  >
                    拒絕
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
