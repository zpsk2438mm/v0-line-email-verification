"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Mail, Plus, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Clock3 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  // 🎯 關鍵修正：抽取完整的讀取狀態控制
  const liffContext = useLiff();
  const lineUserId = liffContext?.lineUserId;
  const userProfile = liffContext?.userProfile;
  const userEmail = liffContext?.userEmail;
  const isAuthenticated = liffContext?.isAuthenticated ?? false;
  const login = liffContext?.login;
  const userName = liffContext?.userName;
  const liffLoading = liffContext?.isLoading ?? (liffContext ? false : true);

  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 1. 商品撈取邏輯 (基於 line_user_id 撈取)
  const fetchMyProducts = useCallback(async () => {
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      const cacheKey = `products_${lineUserId}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) setMyProducts(JSON.parse(cachedData));

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url, verified_email, line_user_id")
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData = data.map(item => {
          let displayImg = "/placeholder-logo.png";
          if (item.image_url) {
            if (Array.isArray(item.image_url) && item.image_url.length > 0) {
              displayImg = item.image_url[0];
            } else if (typeof item.image_url === 'string') {
              if (item.image_url.startsWith('[')) {
                try {
                  const arr = JSON.parse(item.image_url);
                  if (arr.length > 0) displayImg = arr[0];
                } catch(e) { displayImg = item.image_url; }
              } else {
                displayImg = item.image_url;
              }
            }
          }
          return { ...item, display_image: displayImg };
        });

        setMyProducts(formattedData);
        localStorage.setItem(cacheKey, JSON.stringify(formattedData));
      }
    } catch (err) {
      console.error("個人商品讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated, lineUserId]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // 🎯 關鍵修正：同步中或是尚未拿到使用者核心資料前，絕對阻擋渲染底下的 UI
  if (liffLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
        <p className="text-gray-500 font-bold">正在同步您的 LINE 個人資料...</p>
      </div>
    );
  }

  if (!lineUserId || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <header className="border-b bg-white px-4 py-4 flex items-center gap-3"><Navigation /><h1 className="font-bold">個人中心</h1></header>
        <div className="max-w-md mx-auto p-8 text-center space-y-5">
          <h2 className="text-xl font-bold">請先完成身分驗證</h2>
          {!lineUserId ? (
            <><p className="text-slate-500">個人中心需要 LINE 登入以識別您的商品。</p><Button onClick={login}>使用 LINE 登入</Button></>
          ) : (
            <><p className="text-slate-500">LINE 已連線，請完成南臺校園信箱驗證。</p><Link href="/"><Button>前往校園信箱驗證</Button></Link></>
          )}
        </div>
      </main>
    );
  }

  const previewProducts = myProducts.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-8 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/20 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">
                  {userProfile?.displayName || userName || "南臺同學"}
                </h2>
                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <p className="text-[11px] font-bold uppercase flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" /> {userEmail || "已驗證南台信箱"}
                  </p>
                  {lineUserId && (
                    <p className="text-[10px] font-bold opacity-60">ID: {lineUserId.slice(0, 10)}...</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/my-listings" className="block">
            <Button 
              variant="outline" 
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800 group"
            >
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100/70 transition-colors">
                <Package className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">我的商品</span>
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button 
              variant="outline" 
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800 group"
            >
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100/70 transition-colors">
                <Plus className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">我要刊登</span>
            </Button>
          </Link>
        </div>

        <Card className="border-none shadow-sm rounded-[32px] bg-white p-5">
          <div className="flex items-center justify-between mb-4 border-b border-orange-50/60 pb-3">
            <h3 className="font-black text-base text-slate-700 flex items-center gap-2">
              最近發布商品
            </h3>
          </div>

          {isLoadingProducts && myProducts.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
              目前還沒有上架過商品喔！
            </div>
          ) : (
            <div className="grid gap-3">
              {previewProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-orange-50/60 rounded-[22px] bg-[#FFFDFB]/50">
                  <div className="h-14 w-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img src={p.display_image} className="w-full h-full object-cover" alt={p.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{p.name}</h4>
                    <p className="text-[#D35400] font-black text-sm">NT$ {p.price}</p>
                  </div>
                  
                  {p.status === 'approved' ? (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 已上架
                    </Badge>
                  ) : p.status === 'rejected' ? (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> 已退回
                    </Badge>
                  ) : (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1">
                      <Clock3 className="h-3 w-3" /> 審核中
                    </Badge>
                  ) }
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
