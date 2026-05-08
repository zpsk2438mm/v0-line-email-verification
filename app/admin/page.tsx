"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Clock, CheckCircle, XCircle } from "lucide-react";

// 請確保這裡包含你的 LINE ID
const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea"
];

export default function AdminReviewPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      console.log("當前使用者 ID:", lineUserId);
      setIsAdmin(ADMIN_LINE_IDS.includes(lineUserId));
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  useEffect(() => {
    if (isAdmin) fetchProducts();
  }, [isAdmin]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").eq("is_approved", false);
    setProducts(data || []);
    setLoading(false);
  };

  const handleReview = async (product: any, isApprove: boolean) => {
    try {
      // 1. 更新資料庫 (強制改為 true 或 false)
      const { error } = await supabase.from("products").update({ is_approved: isApprove }).eq("id", product.id);
      if (error) throw error;

      // 2. 主動呼叫通知
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: { ...product, is_approved: isApprove },
          old_record: { ...product, is_approved: !isApprove }
        })
      });

      alert(isApprove ? "已核准！" : "已拒絕！");
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      alert("操作出錯，請重試");
    }
  };

  if (liffLoading || (isAuthenticated && loading && isAdmin)) return <div className="p-10 text-center">驗證中...</div>;

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center max-w-sm">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="font-bold">權限不足</h2>
        <p className="text-xs text-gray-500 mt-2">你的 ID: {lineUserId || "未偵測到"}</p>
      </Card>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="p-4 bg-white border-b sticky top-0 z-10 flex items-center gap-2">
        <Navigation />
        <h1 className="font-bold">商品審核 ({products.length})</h1>
      </header>
      <div className="p-4 max-w-md mx-auto space-y-4">
        {products.map(p => (
          <Card key={p.id} className="overflow-hidden border-none shadow-sm">
            <img src={p.image_url || p.images} className="aspect-video object-cover w-full" />
            <CardContent className="p-4">
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-rose-500 font-bold">NT$ {p.price}</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" onClick={() => handleReview(p, false)} className="text-red-500 border-red-100">拒絕</Button>
                <Button onClick={() => handleReview(p, true)} className="bg-emerald-500 text-white">核准</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <div className="text-center py-20 text-gray-400">目前沒有待處理商品</div>}
      </div>
    </main>
  );
}
