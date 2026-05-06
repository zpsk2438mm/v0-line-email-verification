"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  LogIn,
  ShieldCheck, // 👈 引入盾牌圖標
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  created_at: string;
}

// 💡 這裡就是你原本寫錯的地方，我們幫你補上引號並完美修復了！
const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  approved: { label: "已上架", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  pending: { label: "審核中", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  rejected: { label: "未通過", icon: XCircle, color: "text-rose-600 bg-rose-50 border-rose-200" },
};

// 🔒 暫時的管理員 LINE ID 白名單 (等看到自己 ID 後可以填入)
const ADMIN_LINE_IDS = [
  "U1234567890abcdef1234567890abcdef", // 👈 稍後可以把你的 ID 填在這裡
];

export default function ProfilePage() {
  const { lineUserId, userEmail, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. 檢查是否為管理員
  useEffect(() => {
    if (lineUserId && ADMIN_LINE_IDS.includes(lineUserId)) {
      setIsAdmin(true);
    }
  }, [lineUserId]);

  // 2. 獲取使用者自己上架的商品
  useEffect(() => {
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
      return;
    }

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, status, created_at")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("讀取商品失敗:", error);
          return;
        }
        setMyProducts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  if (liffLoading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold">個人中心</h1>
        </header>
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold">個人中心</h1>
        </header>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-md rounded-2xl bg-white text-center p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">歡迎來到個人中心</h2>
              <p className="text-xs text-slate-500 mt-1">請登入以查看您的個人資料與上架商品</p>
            </div>
            <Button onClick={() => login?.()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl">
              <LogIn className="h-4 w-4 mr-2" />
              使用 LINE 登入
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 1. 用戶資訊卡 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="font-black text-lg">已驗證南台用戶</h2>
                <p className="text-xs text-blue-100 mt-0.5">{userEmail}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>學校信箱：{userEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>註冊時間：已成功通過南台信箱驗證</span>
            </div>
            {lineUserId && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">您的 LINE ID (複製此欄填入 admin 白名單)：</span>
                <code className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 select-all font-mono break-all border border-slate-100">
                  {lineUserId}
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🌟 2. 管理員專屬傳送門 (如果是管理員，直接亮起這個按鈕) */}
        {isAdmin && (
          <Link href="/admin" className="block">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 rounded-2xl shadow-md shadow-amber-100 flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              進入「商品審核管理後台」
            </Button>
          </Link>
        )}

        {/* 3. 我的商品清單 */}
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Package className="h-4.5 w-4.5 text-blue-600" />
              我刊登的商品 ({myProducts.length})
            </h3>
            <Link href="/">
              <Button size="sm" variant="outline" className="text-xs rounded-lg">
                + 我要上架
              </Button>
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Package className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-400">您還沒有上架過任何商品喔</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myProducts.map((product) => {
                const statusInfo = STATUS_CONFIG[product.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-xl border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-800">{product.name}</h4>
                      <p className="text-xs font-extrabold text-rose-500">NT$ {product.price}</p>
                    </div>
                    <Badge className={`text-[10px] font-bold border flex items-center gap-1 shadow-none ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
