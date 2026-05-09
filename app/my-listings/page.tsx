"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  CheckCircle2,
  Clock3,
  Trash2,
  ChevronLeft,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: any;
  images?: any;
  status: string; // 使用 status 判斷
  is_approved: boolean; 
  created_at: string;
}

export default function MyListingsPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (liffLoading) return;

    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        // 直接過濾該 LINE 用戶的商品
        const { data, error } = await supabase
          .from("products")
          .select("*")
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

    if (lineUserId) fetchMyProducts();
  }, [liffLoading, lineUserId]);

  const handleDelete = async (productId: string) => {
    if (!confirm("確定要刪除這項商品嗎？此動作無法復原。")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      setMyProducts(myProducts.filter((p) => p.id !== productId));
    } catch (err) {
      alert("刪除失敗，請稍後再試");
    }
  };

  const getCleanImageUrl = (product: Product) => {
    const fallback = "/placeholder-logo.png";
    let raw = product.image_url || product.images;
    if (!raw) return fallback;
    try {
      let urlString = Array.isArray(raw) ? raw[0] : String(raw);
      if (urlString.startsWith("[")) {
        const parsed = JSON.parse(urlString);
        urlString = Array.isArray(parsed) ? parsed[0] : urlString;
      }
      const clean = urlString.trim().replace(/[\[\]"']/g, "");
      return clean.startsWith("http") ? clean : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // 頂部標頭
  const Header = () => (
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
      <Navigation />
      <Link href="/profile">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400">
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </Link>
      <h1 className="text-lg font-black text-slate-800 tracking-tight">我的商品</h1>
    </header>
  );

  if (liffLoading || isLoadingProducts) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <Header />
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <Skeleton className="h-40 w-full rounded-[32px]" />
          <Skeleton className="h-40 w-full rounded-[32px]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-12">
      <Header />

      <div className="p-6 space-y-6 max-w-md mx-auto">
        {myProducts.length === 0 ? (
          <div className="text-center py-20 space-y-4 bg-white rounded-[32px] p-8 shadow-sm border border-orange-50">
            <Package className="h-16 w-16 mx-auto text-orange-100" />
            <p className="font-bold text-slate-400">目前還沒有刊登商品喔</p>
            <Link href="/">
              <Button className="bg-[#D35400] hover:bg-[#A04000] text-white font-bold rounded-2xl px-8 h-12 shadow-lg shadow-orange-200">
                立刻去上架
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {myProducts.map((product) => (
              <Card key={product.id} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden bg-white transition-all">
                <CardContent className="p-5">
                  <div className="flex gap-5">
                    {/* 商品圖片區 - 參考 image_ace55a.png */}
                    <div className="h-24 w-24 flex-shrink-0 bg-[#FDFBF7] rounded-[24px] overflow-hidden border border-orange-50 shadow-inner">
                      <img 
                        src={getCleanImageUrl(product)} 
                        alt={product.name} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {(e.target as HTMLImageElement).src = "/placeholder-logo.png"}}
                      />
                    </div>

                    {/* 商品資訊區 */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-base text-slate-800 truncate">{product.name}</h3>
                        
                        {/* 狀態標籤 - 樣式參考自圖片 */}
                        {product.status === 'approved' ? (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> 已上架
                          </Badge>
                        ) : product.status === 'rejected' ? (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> 已退回
                          </Badge>
                        ) : (
                          <Badge className="rounded-xl px-2.5 py-1 text-[10px] font-black bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> 審核中
                          </Badge>
                        )}
                      </div>

                      <p className="text-lg font-black text-[#D35400] mt-1">NT$ {product.price.toLocaleString()}</p>
                      <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                        {new Date(product.created_at).toLocaleDateString()}
                      </p>

                      {/* 刪除按鈕區 - 下方虛線分隔 */}
                      <div className="mt-4 pt-3 border-t border-dashed border-orange-100">
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="text-[13px] text-rose-500 font-black flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" /> 刪除商品
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
