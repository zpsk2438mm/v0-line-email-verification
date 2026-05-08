"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminReviewPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      if (ADMIN_LINE_IDS.includes(lineUserId)) {
        setIsAdmin(true);
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  async function fetchData() {
    const { data } = await supabase.from("products").select("*").eq("is_approved", false);
    setProducts(data || []);
    setLoading(false);
  }

  const handleReview = async (productId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await supabase.from("products").update({ is_approved: true }).eq("id", productId);
      } else {
        await supabase.from("products").delete().eq("id", productId);
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
      alert(action === 'approve' ? "已核准" : "已拒絕");
    } catch (e) {
      alert("操作失敗");
    }
  };

  if (liffLoading || loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-10 text-center"><ShieldAlert className="mx-auto text-red-500" />權限不足</div>;

  return (
    <main className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4"><Navigation /><h1 className="font-bold">審核中 ({products.length})</h1></div>
      {products.map(p => {
        const path = String(p.image_url || p.images || "").replace(/[\[\]"']/g, '').replace(/^\//, '');
        const img = `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${path}`;
        return (
          <Card key={p.id} className="mb-4 overflow-hidden">
            <img src={img} className="w-full aspect-video object-cover bg-gray-100" />
            <CardContent className="p-4">
              <h3 className="font-bold">{p.name}</h3>
              <p className="text-rose-500 font-bold mb-4">NT$ {p.price}</p>
              <div className="flex gap-2">
                <Button onClick={() => handleReview(p.id, 'approve')} className="flex-1 bg-green-500 text-white">核准</Button>
                <Button onClick={() => handleReview(p.id, 'reject')} variant="outline" className="flex-1 text-red-500">拒絕</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
