"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Loader2, 
  UserCircle, 
  Mail, 
  Package, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

// --- 資料結構定義 ---
interface Product {
  id: string;
  name: string;
  price: number;
  status: string; // 'pending', 'approved', 'rejected'
  created_at: string;
  image_url?: any;
}

// 狀態標籤工具
const STATUS_MAP = {
  approved: { label: "已上架", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  pending: { label: "審核中", color: "bg-orange-50 text-orange-700", icon: Clock },
  rejected: { label: "被退回", color: "bg-red-50 text-red-700", icon: AlertTriangle },
};

export default function ProfilePage() {
  const { lineUserId, userEmail, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 解析圖片網址
  const getImageUrl = (raw: any) => {
    if (!raw) return "/placeholder-logo.png";
    try {
      let url = Array.isArray(raw) ? raw[0] : String(raw);
      let clean = url.replace(/[\[\]"']/g, '').replace(/\\/g, '').trim();
      if (clean.startsWith('http')) return clean;
      return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace(/^\//, '')}`;
    } catch (e) {
      return "/placeholder-logo.png";
    }
  };

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      fetchMyProducts();
    } else if (!liffLoading) {
      setLoading(false);
    }
  }, [liffLoading, isAuthenticated, lineUserId]);

  // 🔍 抓取我的商品逻辑
  async function fetchMyProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, status, created_at, image_url")
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (err) {
      console.error("載入我的商品失敗:", err);
    } finally {
      setLoading(false);
    }
  }

  if (liffLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><Loader2 className="animate-spin text-orange-500" /></div>;
  }

  // --- 未登入介面 (與Explore一致) ---
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <Card className="p-8 text-center shadow-xl rounded-2xl bg-white border-none space-y-4">
          <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-800">請先登入</h1>
          <p className="text-gray-500 text-sm">登入後即可查看您的個人資訊與發布的商品。</p>
          <Button asChild className="bg-orange-600 text-white"><Link href="/">回首頁</Link></Button>
        </Card>
      </main>
    );
  }

  // 🎯 限制只顯示前 4 筆作為預覽
  const previewProducts = myProducts.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24 text-slate-800 font-sans">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-4 flex items-center gap-3">
        <Navigation />
        <h1 className="font-bold text-xl tracking-tight">個人中心</h1>
      </header>

      {/* 使用者資訊區塊 (與 image_13.png 一致的橘色背景) */}
      <div className="bg-[#D95300] p-6 text-white text-center flex flex-col items-center gap-2">
        <div className="w-24 h-24 rounded-full border-4 border-white/50 overflow-hidden bg-gray-100 mb-2">
          <UserCircle className="w-full h-full text-gray-300" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{userEmail?.split('@')[0] || "校園用戶"}</h2>
        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-sm">
          <Mail className="w-4 h-4 text-orange-100" />
          <span className="font-medium text-orange-50 truncate max-w-[200px]">{userEmail || "未認證 Email"}</span>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 -mt-6">
        {/* 🎯 「我的商品」按鈕 (取代舊標題) */}
        <Link href="/my-listings" className="block active:scale-[0.98] transition-transform">
          <Card className="border-none shadow-2xl rounded-3xl bg-white p-5 flex items-center justify-between group hover:bg-orange-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-orange-700">我的商品</h3>
                <p className="text-sm text-gray-500">查看、修改或刪除您發布的物品</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-orange-400 group-hover:text-orange-600">
                <span className="font-bold text-sm">{myProducts.length} 件</span>
                <ChevronRight className="w-6 h-6" />
            </div>
          </Card>
        </Link>

        {/* 商品預覽列表 (限制顯示4筆) */}
        <section className="space-y-4">
          <h4 className="text-sm font-bold text-gray-500 px-1">最近發布 (預覽)</h4>
          {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-orange-300" /></div>
          ) : previewProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">✨ 您目前沒有任何商品</div>
          ) : (
            previewProducts.map((product) => {
              const statusConfig = STATUS_MAP[product.status as keyof typeof STATUS_MAP] || STATUS_MAP.pending;
              const StatusIcon = statusConfig.icon;
              return (
                <Link href={`/products/${product.id}`} key={product.id} className="block group active:scale-[0.97] transition-transform">
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4 flex gap-4 items-center group-hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                      <img src={getImageUrl(product.image_url)} className="w-full h-full object-cover onError={(e) => e.currentTarget.src = '/placeholder-logo.png'}" alt="Product" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-orange-700">{product.name}</h4>
                      <p className="text-lg font-black text-[#D35400]">NT$ {product.price.toLocaleString()}</p>
                    </div>
                    <Badge className={`border-none ${statusConfig.color} px-3 py-1 rounded-full text-xs font-bold flex gap-1 items-center shrink-0`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </Badge>
                  </Card>
                </Link>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
