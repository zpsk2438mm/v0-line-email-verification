"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Package, 
  Mail, 
  Plus, 
  CheckCircle2, 
  Clock3, 
  AlertCircle, 
  Trash2,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  created_at: string;
  image_url: any;
}

export default function ProfilePage() {
  // 從 Liff Provider 獲取 line_user_id 與 verified_email
  const { lineUserId, userProfile, userEmail, isAuthenticated, login } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 核心：雙重識別查詢邏輯 (line_user_id + verified_email)
  const fetchMyProducts = useCallback(async () => {
    // 必須同時具備身分驗證與至少一個識別碼
    if (!isAuthenticated || (!lineUserId && !userEmail)) {
      if (!isAuthenticated) setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      
      let query = supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url");

      // 雙重認證過濾：使用 .or() 確保只要符合其中之一即顯示，達成跨平台同步
      if (lineUserId && userEmail) {
        query = query.or(`line_user_id.eq.${lineUserId},email.eq.${userEmail}`);
      } else if (userEmail) {
        query = query.eq("email", userEmail);
      } else {
        query = query.eq("line_user_id", lineUserId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (err) {
      console.error("資料讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated, lineUserId, userEmail]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這項商品嗎？")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setMyProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("刪除失敗，請檢查權限");
    }
  };

  const getProductImage = (url: any): string => {
    const fallback = "/placeholder-logo.png";
    if (!url) return fallback;
    try {
      if (Array.isArray(url)) return url[0] || fallback;
      if (typeof url === "string" && url.startsWith("[")) {
        return JSON.parse(url)[0];
      }
      return url;
    } catch (e) { return fallback; }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 rounded-3xl bg-white border-none shadow-xl">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10 text-[#D35400]" />
          </div>
          <h2 className="font-bold text-2xl text-slate-800">身分雙重驗證</h2>
          <p className="text-slate-500 text-sm">請登入以串接 LINE 與 Email 資訊</p>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] hover:bg-[#E67E22] h-14 rounded-2xl font-bold text-white">
            立即登入
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 使用者身分卡片 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-10 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-white/20"><User size={32} /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">
                  {userProfile?.displayName || userEmail?.split('@')[0] || "驗證用戶"}
                </h2>
                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <p className="text-[10px] font-bold truncate uppercase">{userEmail || "Email 未驗證"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" />
                    <p className="text-[10px] font-bold truncate uppercase">UID: {lineUserId ? lineUserId.slice(0, 10) + '...' : '未連結'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品管理 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between border-b border-orange-50 pb-5 mb-5">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-[#D35400]" />
              我的商品清單
            </h3>
            <Link href="/">
              <Button size="sm" className="rounded-xl bg-orange-50 text-[#D35400] font-black h-10 border-none px-4">
                <Plus className="h-4 w-4 mr-1 stroke-[3px]" /> 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-16 opacity-40 font-bold">目前暫無刊登商品</div>
          ) : (
            <div className="grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="flex flex-col p-4 border border-orange-50 rounded-[28px] bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-[#FDFBF7] shrink-0">
                      <img 
                        src={getProductImage(product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {(e.target as HTMLImageElement).src = "/placeholder-logo.png"}}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                      <p className="text-base font-black text-[#D35400] mt-0.5">NT$ {product.price.toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {product.status === 'approved' ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">已上架</Badge>
                      ) : (
                        <Badge className="bg-orange-50 text-[#D35400] border-none font-black text-[10px]">審核中</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-dashed border-orange-100">
                    <button onClick={() => handleDelete(product.id)} className="text-rose-500 text-xs font-bold flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> 刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
