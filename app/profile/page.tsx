"use client";

import { useEffect, useState } from "react";
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
  Trash2 
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  status: string;
  created_at: string;
  image_url: any;
}

export default function ProfilePage() {
  const { lineUserId, userProfile, userEmail, isAuthenticated, login } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 讀取商品列表
  const fetchMyProducts = async () => {
    if (!isAuthenticated || !lineUserId) {
      if (!isAuthenticated) setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, is_approved, status, created_at, image_url")
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (err) {
      console.error("讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  // 刪除商品功能
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這項商品嗎？")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // 更新 UI 列表
      setMyProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("刪除失敗:", err);
      alert("刪除失敗，請稍後再試");
    }
  };

  const getProductImage = (url: any): string => {
    const fallback = "/placeholder-logo.png";
    if (!url) return fallback;
    try {
      if (Array.isArray(url)) return url[0] || fallback;
      if (typeof url === "string" && url.startsWith("[")) {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) ? parsed[0] : url;
      }
      return url;
    } catch (e) { return url; }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 rounded-3xl bg-white border-none shadow-xl">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-[#D35400]" />
          </div>
          <h2 className="font-bold text-2xl text-slate-800">請先登入</h2>
          <Button onClick={() => login?.()} className="w-full bg-[#D35400] hover:bg-[#E67E22] h-14 rounded-2xl font-bold text-white shadow-lg transition-colors">使用 LINE 登入</Button>
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
        {/* 用戶資訊卡片 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-10 px-6">
            <div className="flex items-center gap-5 text-left">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/10 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-white/20"><User size={32} /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate tracking-tight">{userProfile?.displayName || "用戶"}</h2>
                <div className="flex items-center gap-1.5 text-orange-100/80 mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  <p className="text-xs font-semibold truncate uppercase">{userEmail || "個人檔案載入中"}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 商品列表卡片 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-6">
          <div className="flex items-center justify-between border-b border-orange-50 pb-5 mb-5">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-[#D35400]" />
              我刊登的商品
            </h3>
            <Link href="/">
              <Button size="sm" className="rounded-xl bg-orange-50 text-[#D35400] font-black hover:bg-orange-100 border-none px-4 h-10 shadow-none">
                <Plus className="h-4 w-4 mr-1 stroke-[3px]" /> 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-4"><Skeleton className="h-24 w-full rounded-2xl" /></div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-14 w-14 mx-auto text-orange-100 mb-4" />
              <p className="text-slate-400 font-bold">目前還沒有刊登任何商品</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="flex flex-col p-4 border border-orange-50 rounded-[28px] bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    {/* 商品圖片 */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-[#FDFBF7] shrink-0 border border-orange-50">
                      <img 
                        src={getProductImage(product.image_url)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {(e.target as HTMLImageElement).src = "/placeholder-logo.png"}}
                      />
                    </div>

                    {/* 商品文字資訊 */}
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{product.name}</h4>
                      <p className="text-base font-black text-[#D35400] mt-0.5">NT$ {product.price.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* 狀態標籤 */}
                    <div className="shrink-0">
                      {product.status === 'approved' ? (
                        <Badge className="rounded-lg text-[10px] py-1 bg-emerald-50 text-emerald-600 border-emerald-100 font-black shadow-none flex gap-1 items-center">
                          <CheckCircle2 className="w-3 h-3" /> 已上架
                        </Badge>
                      ) : product.status === 'rejected' ? (
                        <Badge className="rounded-lg text-[10px] py-1 bg-rose-50 text-rose-600 border-rose-100 font-black shadow-none flex gap-1 items-center">
                          <AlertCircle className="w-3 h-3" /> 已退回
                        </Badge>
                      ) : (
                        <Badge className="rounded-lg text-[10px] py-1 bg-orange-50 text-[#D35400] border-orange-100 font-black shadow-none flex gap-1 items-center">
                          <Clock3 className="w-3 h-3" /> 審核中
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 刪除按鈕區域 */}
                  <div className="mt-3 pt-3 border-t border-dashed border-orange-100">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-rose-500 text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 刪除商品
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
