"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

const ADMIN_IDS = ["Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 網址解析邏輯 (保留您目前可運行的版本)
  const getImageUrl = (raw: any) => {
    if (!raw) return "/placeholder-logo.png";
    try {
      let url = Array.isArray(raw) ? raw[0] : (typeof raw === 'string' && raw.startsWith('[') ? JSON.parse(raw)[0] : raw);
      return url.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim();
    } catch (e) { return "/placeholder-logo.png"; }
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
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });
    if (!error) setPendingProducts(data || []);
    setLoading(false);
  }

  // 🛡️ 強化後的核准功能
  async function handleApprove(id: string) {
    setProcessingId(id);
    const { error } = await supabase
      .from("products")
      .update({ is_approved: true })
      .eq("id", id);
    
    if (error) {
      alert("核准失敗，請檢查權限");
      console.error(error);
    } else {
      // 成功後立即從 UI 移除，不必等 fetchData
      setPendingProducts(prev => prev.filter(p => p.id !== id));
    }
    setProcessingId(null);
  }

  // 🛡️ 強化後的拒絕功能 (刪除)
  async function handleDelete(id: string) {
    if (!confirm("確定要拒絕並永久刪除此商品嗎？")) return;
    
    setProcessingId(id);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    
    if (error) {
      alert("刪除失敗。提示：請確保資料庫 RLS 政策允許管理員進行 DELETE 操作。");
      console.error(error);
    } else {
      // 成功後立即從 UI 移除
      setPendingProducts(prev => prev.filter(p => p.id !== id));
    }
    setProcessingId(null);
  }

  if (liffLoading || loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin h-10 w-10 text-orange-500" /></div>;

  if (!lineUserId || !ADMIN_IDS.includes(lineUserId)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">未獲授權</h1>
        <p className="text-gray-500 mb-6">此區域僅限管理員存取</p>
        <Button asChild className="bg-orange-600 text-white rounded-xl px-8 h-12 shadow-lg"><a href="/">返回首頁</a></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24 text-slate-800">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Navigation />
          <div className="h-8 w-1 bg-orange-500 rounded-full mx-1"></div>
          <h1 className="font-black text-xl tracking-tight">待審核項目 ({pendingProducts.length})</h1>
        </div>
        <Button onClick={fetchData} variant="ghost" className="text-orange-600 font-bold hover:bg-orange-50 rounded-xl">
          刷新清單
        </Button>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {pendingProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-medium">目前沒有待審核項目 ✨</div>
        ) : (
          pendingProducts.map((product) => (
            <Card key={product.id} className="border-none shadow-2xl shadow-gray-200/50 rounded-[40px] bg-white overflow-hidden transition-all">
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
                    disabled={processingId === product.id}
                    className="flex-[2] bg-[#00E000] hover:bg-[#00CC00] text-white h-16 rounded-[24px] text-lg font-black shadow-lg shadow-green-100 active:scale-95 transition-transform"
                  >
                    {processingId === product.id ? <Loader2 className="animate-spin h-6 w-6" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    disabled={processingId === product.id}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 h-16 rounded-[24px] font-bold active:scale-95 transition-transform"
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
