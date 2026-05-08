"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Package,
  Calendar,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_approved: boolean;
  created_at: string;
  image_url?: any;
  images?: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
];

export default function AdminReviewPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      if (ADMIN_LINE_IDS.includes(lineUserId)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    async function fetchPendingProducts() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_approved", false)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("獲取待審核商品失敗:", error);
          return;
        }

        setPendingProducts(data || []);
      } catch (err) {
        console.error("未預期的錯誤:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPendingProducts();
  }, [isAdmin]);

  const handleReview = async (productId: string, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        const { error } = await supabase
          .from("products")
          .update({ is_approved: true })
          .eq("id", productId);

        if (error) throw error;
        alert("🎉 商品已成功核准上架！");
      } else {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", productId);

        if (error) throw error;
        alert("❌ 已拒絕並刪除該商品上架申請。");
      }
      setPendingProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("更新審核狀態出錯:", err);
      alert("操作失敗，請重試！");
    }
  };

  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "";
    let urlString = "";
    if (Array.isArray(raw)) {
      urlString = raw[0] || "";
    } else if (typeof raw === "string") {
      if (raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          urlString = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) {
          urlString = raw;
        }
      } else {
        urlString = raw;
      }
    } else {
      urlString = String(raw);
    }
    if (!urlString) return "";
    let clean = urlString.trim().replace(/^\[['"]?/, "").replace(/['"]?\]$/, "").replace(/\\/g, "").replace(/^['"]/, "").replace(/['"]$/, "").trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    } else {
      const cleanPath = clean.replace(/^\//, "");
      return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace("product-images/", "")}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (liffLoading || (isAuthenticated && isLoading && isAdmin)) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">審核後台載入中...</h1>
        </header>
        <div className="mx-auto max-w-lg px-4 pt-12 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  // 權限不足的錯誤畫面 - 也統一為橘色調
  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen bg-[#FDFBF7]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">系統管理後台</h1>
        </header>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-lg bg-white rounded-3xl overflow-hidden">
            <div className="h-2 bg-[#D35400]" /> {/* 頂部橘色條 */}
            <CardContent className="pt-8 pb-8 text-center space-y-4 px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 mx-auto">
                <ShieldAlert className="h-8 w-8 text-[#D35400]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-slate-800">⚠️ 存取權限不足</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  本頁面僅限系統管理員進入。<br/>若您是管理員，請確認已正確登入。
                </p>
              </div>
              <Button asChild className="w-full bg-[#D35400] hover:bg-[#E67E22] rounded-xl font-bold">
                <Link href="/">返回市集首頁</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-12 text-left">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md shadow-orange-100">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800">商品審核中心</h1>
          <p className="text-[10px] text-[#D35400] font-black uppercase tracking-tighter">System Administrator</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#D35400]" />
            待處理申請 ({pendingProducts.length})
          </h3>
        </div>

        {pendingProducts.length === 0 ? (
          <Card className="py-20 text-center border-2 border-dashed border-orange-100 bg-white rounded-3xl shadow-sm">
            <CardContent className="space-y-4">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">暫無待審核商品</p>
                <p className="text-xs text-slate-400 mt-1">目前所有同學提交的物件都已處理完畢。</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {pendingProducts.map((product) => {
              const imageUrl = getCleanImageUrl(product);
              return (
                <Card key={product.id} className="overflow-hidden bg-white border border-orange-50 shadow-sm rounded-3xl">
                  <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder-logo.png";
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-slate-300" />
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 backdrop-blur-sm text-[#D35400] font-black hover:bg-white text-[10px] shadow-sm border-none px-3 py-1 rounded-lg">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-lg text-slate-800 line-clamp-1">
                          {product.name}
                        </h4>
                        <span className="text-xl font-black text-[#D35400] shrink-0">
                          ${product.price.toLocaleString()}
                        </span>
                      </div>
                      {product.description && (
                        <div className="bg-[#FDFBF7] p-3 rounded-2xl border border-orange-50/50">
                          <p className="text-xs text-slate-500 leading-relaxed italic">
                            "{product.description}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold border-t pt-4 border-dashed border-slate-100">
                      <Calendar className="h-3 w-3 text-orange-300" />
                      提交於：{formatDate(product.created_at)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Button
                        onClick={() => handleReview(product.id, "reject")}
                        variant="outline"
                        className="border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-bold rounded-2xl h-12"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        拒絕申請
                      </Button>
                      <Button
                        onClick={() => handleReview(product.id, "approve")}
                        className="bg-[#D35400] hover:bg-[#E67E22] text-white font-bold rounded-2xl h-12 shadow-lg shadow-orange-100"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        核准上架
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
