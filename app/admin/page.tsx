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

// 定義 Product 介面，確保包含 line_user_id
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
  line_user_id?: string; // 👈 重要：確保有這個欄位才能發通知
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
      setIsAdmin(ADMIN_LINE_IDS.includes(lineUserId));
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

        if (error) throw error;
        setPendingProducts(data || []);
      } catch (err) {
        console.error("獲取待審核商品失敗:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPendingProducts();
  }, [isAdmin]);

  // 🚀 修改後的審核動作
  const handleReview = async (product: Product, action: "approve" | "reject") => {
    try {
      const isApprove = action === "approve";

      // 1. 更新資料庫狀態 (不再直接刪除，而是更新狀態以便 Webhook 運作)
      const { error } = await supabase
        .from("products")
        .update({ is_approved: isApprove })
        .eq("id", product.id);

      if (error) throw error;

      // 2. 【保險機制】主動呼叫 API 通知 LINE
      // 這樣即使 Webhook 沒反應，訊息也一定會發出去
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            ...product,
            is_approved: isApprove,
            image_url: getCleanImageUrl(product) // 確保圖片網址正確傳遞
          },
          old_record: {
            ...product,
            is_approved: !isApprove 
          }
        })
      });

      alert(isApprove ? "🎉 商品已核准上架！" : "❌ 已拒絕該商品申請。");

      // 從畫面上移除
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      console.error("審核流程出錯:", err);
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
        } catch (e) { urlString = raw; }
      } else { urlString = raw; }
    } else { urlString = String(raw); }

    let clean = urlString.trim().replace(/^\[['"]?/, "").replace(/['"]?\]$/, "").replace(/\\/g, "").replace(/^['"]/, "").replace(/['"]$/, "").trim();
    if (clean.startsWith("http")) return clean;
    const cleanPath = clean.replace(/^\//, "");
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath.replace('product-images/', '')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-TW", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (liffLoading || (isAuthenticated && isLoading && isAdmin)) {
    return (
      <main className="min-h-screen bg-slate-50">
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

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">系統管理後台</h1>
        </header>
        <div className="min-h-[75vh] flex items-center justify-center p-4 text-center">
            <Card className="p-8"><ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4"/>權限不足</Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-100">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800">商品審核中心</h1>
          <p className="text-[10px] text-indigo-600 font-medium">管理員模式</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-amber-500" />
          待處理商品 ({pendingProducts.length})
        </h3>

        {pendingProducts.length === 0 ? (
          <Card className="py-16 text-center bg-white rounded-2xl border-dashed border-2">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-700">目前沒有待審核商品</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingProducts.map((product) => {
              const imageUrl = getCleanImageUrl(product);
              return (
                <Card key={product.id} className="overflow-hidden bg-white shadow-sm rounded-2xl border-none">
                  <div className="aspect-[16/10] bg-slate-100 relative">
                    {imageUrl && <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />}
                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700">{CATEGORY_LABELS[product.category] || product.category}</Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800">{product.name}</h4>
                      <span className="font-black text-rose-500">NT$ {product.price.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">申請時間：{formatDate(product.created_at)}</div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {/* 注意這裡傳入的是整個 product 物件 */}
                      <Button
                        onClick={() => handleReview(product, "reject")}
                        variant="outline"
                        className="border-red-200 text-red-600 font-bold rounded-xl h-11"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" /> 拒絕
                      </Button>
                      <Button
                        onClick={() => handleReview(product, "approve")}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-11"
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" /> 核准
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
