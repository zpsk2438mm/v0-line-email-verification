"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Package } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<any[]>([]);

  // 【新增】強制登入邏輯
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  useEffect(() => {
    if (!isAuthenticated || !lineUserId) return;
    async function fetchMyProducts() {
      const { data } = await supabase.from("products").select("*").eq("line_user_id", lineUserId);
      setMyProducts(data || []);
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  if (liffLoading || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center">
                {/* 【修正】加入 referrerPolicy 以顯示頭像 */}
                <img 
                  src={userProfile?.pictureUrl || ""} 
                  className="h-full w-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div>
                <h2 className="font-black text-xl">{userProfile?.displayName || "南台用戶"}</h2>
                <p className="text-xs text-blue-100">{userProfile?.email || "4B290004@STUST.EDU.TW"}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Package className="h-4 w-4" /> 我刊登的商品</h3>
          <div className="grid gap-3">
            {myProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl">
                <div className="h-12 w-12 bg-slate-100 rounded-lg overflow-hidden">
                  {/* 【修正】商品圖片顯示邏輯 */}
                  <img src={Array.isArray(p.image_url) ? p.image_url[0] : p.image_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{p.name}</h4>
                  <p className="text-rose-500 font-bold text-xs">NT$ {p.price}</p>
                </div>
                <Badge className="text-[10px]">{p.is_approved ? "已上架" : "審核中"}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
