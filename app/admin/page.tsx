"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2, ImageOff } from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      setIsAdmin(ADMIN_LINE_IDS.includes(lineUserId));
      setFetching(false);
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  async function fetchData() {
    const { data } = await supabase.from("products").select("*").eq("is_approved", false);
    setProducts(data || []);
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await supabase.from("products").update({ is_approved: true }).eq("id", id);
      } else {
        await supabase.from("products").delete().eq("id", id);
      }
      setProducts(prev => prev.filter(p => p.id !== id));
      alert(action === 'approve' ? "已核准並發送通知" : "已拒絕並刪除");
    } catch (e) {
      alert("操作失敗");
    }
  };

  const getImgUrl = (p: any) => {
    const raw = p.image_url || p.images || "";
    if (!raw) return null;
    const clean = String(raw).replace(/[\[\]"']/g, '').replace(/^\//, '');
    return clean.startsWith('http') ? clean : `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean}`;
  };

  if (liffLoading || fetching) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-orange-500" /></div>;
  if (!isAdmin) return <div className="p-20 text-center text-red-500"><ShieldAlert className="mx-auto mb-2" />管理權限驗證失敗</div>;

  return (
    <main className="p-4 max-w-lg mx-auto pb-20">
      <div className="flex items-center gap-2 mb-6"><Navigation /><h1 className="font-bold text-xl">待審核商品</h1></div>
      
      <div className="space-y-4">
        {products.map(p => (
          <Card key={p.id} className="overflow-hidden border-none shadow-md rounded-2xl bg-white">
            <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
              {getImgUrl(p) ? (
                <img src={getImgUrl(p)} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display='none'} />
              ) : (
                <ImageOff className="text-gray-300" />
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg text-slate-800">{p.name}</h3>
              <p className="text-rose-500 font-black text-xl mb-4">NT$ {p.price?.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleAction(p.id, 'approve')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl">核准</Button>
                <Button onClick={() => handleAction(p.id, 'reject')} variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 font-bold h-12 rounded-xl">拒絕</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {products.length === 0 && (
          <div className="text-center py-20 text-gray-400">目前沒有需要審核的商品 ✨</div>
        )}
      </div>
    </main>
  );
}
