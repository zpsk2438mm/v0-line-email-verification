"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2 } from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      setIsAdmin(ADMIN_LINE_IDS.includes(lineUserId));
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("products").select("*").eq("is_approved", false).then(({ data }) => setProducts(data || []));
    }
  }, [isAdmin]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      await supabase.from("products").update({ is_approved: true }).eq("id", id);
    } else {
      await supabase.from("products").delete().eq("id", id);
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    alert(action === 'approve' ? "已核准" : "已拒絕並刪除");
  };

  if (liffLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!isAdmin) return <div className="p-20 text-center text-red-500"><ShieldAlert className="mx-auto" />權限不足</div>;

  return (
    <main className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6"><Navigation /><h1 className="font-bold text-xl">待審核</h1></div>
      {products.map(p => (
        <Card key={p.id} className="mb-4 overflow-hidden">
          <CardContent className="p-4">
            <h3 className="font-bold text-lg">{p.name}</h3>
            <p className="text-rose-500 font-bold mb-4">NT$ {p.price}</p>
            <div className="flex gap-2">
              <Button onClick={() => handleAction(p.id, 'approve')} className="flex-1 bg-green-500 text-white">核准</Button>
              <Button onClick={() => handleAction(p.id, 'reject')} variant="outline" className="flex-1 text-red-500">拒絕</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {products.length === 0 && <p className="text-center text-gray-400 py-10">目前沒有待審核商品</p>}
    </main>
  );
}
