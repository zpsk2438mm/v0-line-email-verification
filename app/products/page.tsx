"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, ShoppingBag, Flame, Loader2, Mail } from "lucide-react";

export default function ExploreProductsPage() {
  const { login } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null 表示正在檢查
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // 1. 同步抓取資料與檢查登入，不互相等待
    async function fetchData() {
      try {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        setProducts(data || []);
        setFilteredProducts(data || []);
      } finally {
        setFetching(false);
      }
    }

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    }

    fetchData();
    checkAuth();

    // 2. 監聽登入狀態更新（例如信箱驗證成功回傳）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. 搜尋過濾
  useEffect(() => {
    const res = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredProducts(res);
  }, [searchQuery, products]);

  // 如果正在初始化且還沒抓到資料，顯示簡單載入
  if (fetching && products.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  }

  // --- 如果確定沒登入，顯示登入遮罩 ---
  if (isLoggedIn === false) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center space-y-6 border border-orange-50">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-[#D35400]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">歡迎回來</h2>
            <p className="text-sm text-slate-400 px-4">請完成最後一次驗證，系統會自動記住您，刷新不再跳出。</p>
          </div>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] text-white py-8 rounded-2xl text-lg font-bold shadow-lg shadow-orange-200">
            立即登入
          </Button>
        </div>
      </main>
    );
  }

  // --- 正常渲染頁面 ---
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400]"><ShoppingBag className="h-5 w-5 text-white" /></div>
        <h1 className="font-bold">南臺市集</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <Input 
          placeholder="搜尋商品..." 
          className="rounded-2xl py-6 border-slate-200 bg-white shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex items-center gap-1.5 pt-2">
          <Flame className="h-4 w-4 text-[#D35400]" />
          <span className="font-bold text-sm text-slate-600">最新上架</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`}>
              <Card className="overflow-hidden border-none shadow-sm rounded-3xl bg-white">
                <div className="aspect-square bg-slate-100">
                  <img src={p.image_url || "/placeholder-logo.png"} className="object-cover h-full w-full" />
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</h4>
                  <p className="text-[#D35400] font-black">NT$ {p.price}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
