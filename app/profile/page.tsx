"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  image_url: any;
}

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df"];

export default function ProfilePage() {
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 強制驗證邏輯
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  useEffect(() => {
    if (lineUserId && ADMIN_LINE_IDS.includes(lineUserId)) {
      setIsAdmin(true);
    }
  }, [lineUserId]);

  useEffect(() => {
    if (!isAuthenticated || !lineUserId) return;

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, is_approved, image_url")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMyProducts(data || []);
      } catch (err) {
        console.error("讀取失敗:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  if (liffLoading || !isAuthenticated) {
    return <div className="h-screen flex items-center justify-center"><Skeleton className="h-32 w-80 rounded-2xl" /></div>;
  }

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
              {/* LINE 頭像區塊 - 修正點 */}
              <div className="h-16 w-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="LINE" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer" // 👈 解決 LINE 圖片顯示問題
                  />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-xl truncate">
                  {userProfile?.displayName || "南台用戶"} 
                </h2>
                <p className="text-xs text-blue-100 opacity-80 truncate">
                  {userProfile?.email || "已完成 LINE 驗證"}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 text-white font-bold py-6 rounded-2xl shadow-md"><ShieldCheck className="mr-2" /> 進入管理後台</Button>
          </Link>
        )}

        <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /> 我刊登的商品</h3>
            <Link href="/upload"><Button size="sm" variant="outline">+ 上架</Button></Link>
          </div>

          <div className="grid gap-3">
            {isLoadingProducts ? <Skeleton className="h-20 w-full" /> : myProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl">
                <div className="h-12 w-12 bg-slate-100 rounded-lg overflow-hidden">
                   <img src={Array.isArray(p.image_url) ? p.image_url[0] : p.image_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{p.name}</h4>
                  <p className="text-rose-500 font-bold text-xs">NT$ {p.price}</p>
                </div>
                {p.is_approved ? (
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />已上架</Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-600 border-amber-100 text-[10px]"><Clock className="h-3 w-3 mr-1" />審核中</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
