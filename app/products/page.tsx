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
  // 雖然引入 useLiff，但我們只在「真的沒登入」時才用它的 login
  const { login, isLoading: liffLoading } = useLiff();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function checkAuthAndData() {
      try {
        // 1. 優先檢查 Supabase Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }

        // 2. 不管有沒有登入，先抓資料（這樣頁面才不會一直轉）
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (err) {
        console.error("初始化失敗:", err);
      } finally {
        setFetching(false);
      }
    }
    checkAuthAndData();

    // 監聽登入狀態轉變
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setAuthStatus('authenticated');
      else setAuthStatus('unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 搜尋邏輯 ---
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    const result = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query))
    );
    setFilteredProducts(result);
  }, [searchQuery, products]);

  // 1. 最優先顯示：如果正在初始化 Auth 或抓第一波資料，轉圈圈
  if (authStatus === 'loading' && fetching) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-[#D35400]" /></div>;
  }

  // 2. 如果沒登入，顯示登入按鈕
  if (authStatus === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-4">
          <Mail className="h-12 w-12 text-[#D35400] mx-auto" />
          <h2 className="text-xl font-bold">歡迎回來</h2>
          <p className="text-sm text-slate-500">請完成最後一次登入，系統將會自動記住您。</p>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] text-white py-6 rounded-xl">立即登入</Button>
        </div>
      </main>
    );
  }

  // 3. 已登入，顯示正常首頁
  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400]"><ShoppingBag className="h-5 w-5 text-white" /></div>
        <h1 className="text-lg font-bold">市集首頁</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <Input 
          placeholder="搜尋商品..." 
          className="rounded-xl py-6"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex items-center gap-2 mb-2">
          <Flame className="h-4 w-4 text-[#D35400]" />
          <span className="font-bold text-sm">推薦商品</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="overflow-hidden border-none shadow-sm rounded-2xl bg-white p-3">
                <div className="aspect-square bg-slate-100 rounded-xl mb-2 overflow-hidden">
                  <img src={product.image_url || "/placeholder-logo.png"} className="object-cover h-full w-full" />
                </div>
                <h4 className="font-bold text-sm line-clamp-1">{product.name}</h4>
                <p className="text-[#D35400] font-black mt-1">NT$ {product.price}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
