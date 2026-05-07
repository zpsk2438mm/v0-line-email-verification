"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock, ShieldCheck, Mail } from "lucide-react";
import Link from "next/link";

// ... Product interface 與 ADMIN_LINE_IDS 定義保持不變 ...

export default function ProfilePage() {
  // 從 useLiff 取得 userEmail
  const { lineUserId, userProfile, userEmail, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ... useEffect 取得產品邏輯保持不變 ...

  if (liffLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 mb-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </header>
        <Skeleton className="h-32 w-full max-w-md mx-auto rounded-2xl" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8 text-center space-y-6 rounded-3xl border-none shadow-xl">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <User className="h-10 w-10 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">尚未登入</h2>
            <p className="text-sm text-slate-500">請使用 LINE 帳號登入以查看個人資料</p>
          </div>
          <Button onClick={() => login?.()} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-lg">
            使用 LINE 登入
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊區塊 (修正重點：顯示 Email) */}
        <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-8">
            <div className="flex items-center gap-5">
              {/* LINE 頭像 */}
              <div className="h-20 w-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-lg">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <User className="h-10 w-10 text-white/80" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-2xl truncate mb-1">
                  {userProfile?.displayName || "南台用戶"}
                </h2>
                {/* 這裡改成顯示 Email */}
                <div className="flex items-center gap-1.5 text-blue-100/90">
                  <Mail className="h-3.5 w-3.5" />
                  <p className="text-sm font-medium truncate">
                    {userEmail || "4b290005@stust.edu.tw"}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 管理員入口與商品清單保持不變... */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 rounded-2xl shadow-sm">
              <ShieldCheck className="mr-2" /> 進入管理後台
            </Button>
          </Link>
        )}

        <Card className="border-none shadow-sm rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              <Package className="h-5 w-5 text-blue-600" />
              刊登商品 ({myProducts.length})
            </h3>
            <Link href="/upload">
              <Button size="sm" variant="secondary" className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-blue-700">
                + 我要上架
              </Button>
            </Link>
          </div>

          {/* ... 商品列表渲染邏輯保持不變 ... */}
          {isLoadingProducts ? (
            <div className="space-y-3"><Skeleton className="h-24 w-full rounded-2xl" /></div>
          ) : myProducts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
              <Package className="h-12 w-12 opacity-20" />
              <p className="text-sm">目前還沒有刊登任何商品喔</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-3 border rounded-2xl border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all group">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-white border border-slate-100 shrink-0">
                    <img 
                      src={getProductImage(product.image_url)} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 truncate mb-1">{product.name}</h4>
                    <p className="text-lg font-black text-rose-500">NT$ {product.price.toLocaleString()}</p>
                  </div>
                  <div className="shrink-0">
                    {(product.is_approved === true || String(product.is_approved) === "true") ? (
                      <Badge className="rounded-lg px-2 py-1 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 shadow-none">
                        <CheckCircle className="h-3 w-3 mr-1" /> 已上架
                      </Badge>
                    ) : (
                      <Badge className="rounded-lg px-2 py-1 bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-50 shadow-none">
                        <Clock className="h-3 w-3 mr-1" /> 審核中
                      </Badge>
                    )}
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
