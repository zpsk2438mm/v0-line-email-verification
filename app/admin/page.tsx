"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Package, CheckCircle } from "lucide-react";

const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea"
];

export default function AdminReviewPage() {
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
      supabase.from("products").select("*").eq("is_approved", false)
        .then(({ data }) => setProducts(data || []));
    }
  }, [isAdmin]);

  // 🛠️ 圖片網址處理函數
  const getImageUrl = (path: any) => {
    if (!path) return "";
    let cleanPath = typeof path === 'string' ? path : JSON.stringify(path);
    cleanPath = cleanPath.replace(/[\[\]"']/g, '').trim().replace(/^\//, '');
    
    if (cleanPath.startsWith('http')) return cleanPath;
    
    // 請確認你的 Bucket 名稱是否為 product-images
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
  };

  const handleReview = async (productId: string, isApprove: boolean) => {
    try {
      if (isApprove) {
        await supabase.from("products").update({ is_approved: true }).eq("id", productId);
        alert("✅ 已核准，Webhook 將發送 LINE 通知");
      } else {
        await supabase.from("products").delete().eq("id", productId);
        alert("❌ 已拒絕並刪除");
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert("操作失敗");
    }
  };

  if (!isAdmin) return <div className="p-20 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-red-500"/><p>權限不足</p></div>;

  return (
    <main className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6"><Navigation /><h1 className="font-bold">審核中心</h1></div>
      <div className="space-y-4">
        {products.map(p => {
          const imgUrl = getImageUrl(p.image_url || p.images);
          return (
            <Card key={p.id} className="overflow-hidden border shadow-sm">
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                {imgUrl ? (
                  <img src={imgUrl} alt="product" className="w-full h-full object-cover" />
                ) : (
                  <Package className="text-gray-300 h-10 w-10" />
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <p className="text-rose-500 font-bold mb-4">NT$ {p.price}</p>
                <div className="flex gap-2">
                  <Button onClick={() => handleReview(p.id, true)} className="flex-1 bg-emerald-500 text-white">核准</Button>
                  <Button onClick={() => handleReview(p.id, false)} variant="outline" className="flex-1 text-red-500 border-red-100">拒絕</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {products.length === 0 && <div className="text-center py-20 text-gray-400">目前無待審核商品</div>}
      </div>
    </main>
  );
}
