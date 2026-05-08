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
  line_user_id?: string; // 👈 確保欄位對接
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

// 🔒 管理員 LINE ID 白名單
const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
];

export default function AdminReviewPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. 驗證管理員身份
  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      if (ADMIN_LINE_IDS.includes(lineUserId)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  // 2. 獲取所有「待審核」商品
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

  // 💡 輔助函數：取得乾淨的圖片 URL (為了讓 LINE 能正常顯示)
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
        } catch (e) { urlString = raw; }
      } else { urlString = raw; }
    } else { urlString = String(raw); }

    if (!urlString) return "";
    let clean = urlString.trim().replace(/^\[['"]?/, "").replace(/['"]?\]$/, "").replace(/\\/g, "").replace(/^['"]/, "").replace(/['"]$/, "").trim();

    if (clean.startsWith("http")) return clean;
    const cleanPath = clean.replace(/^\//, "");
    return cleanPath.startsWith("product-images/") 
      ? `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${cleanPath}`
      : `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
  };

  // 🚀 修正後的審核動作：更新狀態並手動發送 LINE 通知
  const handleReview = async (product: Product, action: "approve" | "reject") => {
    try {
      const isApprove = action === "approve";
      const finalImageUrl = getCleanImageUrl(product);

      // 1. 更新資料庫
      if (isApprove) {
        const { error } = await supabase
          .from("products")
          .update({ is_approved: true })
          .eq("id", product.id);
        if (error) throw error;
      } else {
        // 拒絕則刪除
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", product.id);
        if (error) throw error;
      }

      // 2. ⚡ 手動發送 LINE 通知
      // 這樣可以確保只有按按鈕才會發通知，且圖片網址是正確的
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: product.line_user_id,
          record: {
            ...product,
            is_approved: isApprove,
            image_url: finalImageUrl // 傳送處理好的網址
          },
          old_record: { ...product, is_approved: !isApprove }
        })
      });

      alert(isApprove ? "🎉 已核准並發送通知！" : "❌ 已拒絕申請。");
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));

    } catch (err) {
      console.error("更新審核狀態出錯:", err);
      alert("操作失敗，請重試！");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (liffLoading || (isAuthenticated && isLoading && isAdmin)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">載入中...</h1>
        </header>
        <div className="mx-auto max-w-lg px-4 pt-12 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">權限不足</h1>
        </header>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm rounded-2xl text-center p-8">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <p>本頁面僅限系統管理員進入。</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-sm font-bold">商品審核中心</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-500" />
          待處理商品 ({pendingProducts.length})
        </h3>

        {pendingProducts.length === 0 ? (
          <Card className="py-16 text-center rounded-2xl">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
            <p className="font-bold">目前沒有待審核商品</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingProducts.map((product) => {
              const imageUrl = getCleanImageUrl(product);
              return (
                <Card key={product.id} className="overflow-hidden bg-white rounded-2xl border-none shadow-sm">
                  <div className="aspect-[16/10] bg-slate-100 flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-12 w-12 text-slate-300" />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800">{product.name}</h4>
                      <span className="font-black text-rose-500">NT$ {product.price.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        onClick={() => handleReview(product, "reject")}
                        variant="outline"
                        className="text-red-600 border-red-200 font-bold rounded-xl h-11"
                      >
                        拒絕上架
                      </Button>
                      <Button
                        onClick={() => handleReview(product, "approve")}
                        className="bg-emerald-500 text-white font-bold rounded-xl h-11"
                      >
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
