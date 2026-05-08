"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Clock, CheckCircle } from "lucide-react";

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

  // 審核動作：只需更新資料庫，讓 Webhook 去觸發通知
  const handleReview = async (productId: string, isApprove: boolean) => {
    try {
      if (isApprove) {
        await supabase.from("products").update({ is_approved: true }).eq("id", productId);
        alert("已核准！LINE 通知將透過 Webhook 發送。");
      } else {
        // 如果拒絕，為了觸發通知，建議先 update 再 delete，或直接 update 成 rejected 狀態
        // 這裡我們直接刪除 (注意：刪除可能不會觸發含有 old_record 的通知，視 Webhook 設定而定)
        await supabase.from("products").delete().eq("id", productId);
        alert("已拒絕並刪除。");
      }
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert("操作失敗");
    }
  };

  if (!isAdmin) return <div className="p-20 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-red-500"/><p className="mt-4">權限不足 (ID: {lineUserId})</p></div>;

  return (
    <main className="p-4 max-w-lg mx-auto pb-20">
      <div className="flex items-center gap-2 mb-6"><Navigation /><h1 className="font-bold">審核中心 ({products.length})</h1></div>
      <div className="space-y-4">
        {products.map(p => (
          <Card key={p.id} className="overflow-hidden border-none shadow-sm">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">{p.name}</h3>
              <div className="flex gap-2">
                <Button onClick={() => handleReview(p.id, true)} className="flex-1 bg-emerald-500 text-white">核准</Button>
                <Button onClick={() => handleReview(p.id, false)} variant="outline" className="flex-1 text-red-500 border-red-100">拒絕</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && <div className="text-center py-20 text-gray-400"><CheckCircle className="mx-auto mb-2"/>全部處理完畢</div>}
      </div>
    </main>
  );
}
