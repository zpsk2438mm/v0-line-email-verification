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

// 定義商品介面
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
  line_user_id?: string; // 👈 確保這個欄位存在
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
        // 抓取所有欄位，確保 line_user_id 有被抓到
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

  // 🚀 核心修復：審核處理函數
  const handleReview = async (product: any, action: "approve" | "reject") => {
    try {
      const isApprove = action === "approve";
      const targetId = product.line_user_id || product.lineUserId;

      console.log("正在處理商品:", product.name);
      console.log("目標 LINE ID:", targetId);

      // 1. 更新資料庫
      const { error } = await supabase
        .from("products")
        .update({ is_approved: isApprove })
        .eq("id", product.id);

      if (error) throw error;

      // 2. 主動呼叫通知 API (雙重保障)
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: targetId,
          line_user_id: targetId,
          record: {
            ...product,
            is_approved: isApprove,
            line_user_id: targetId
          },
          old_record: {
            ...product,
            is_approved: !isApprove 
          }
        })
      });

      if (!response.ok) {
        console.warn("通知發送可能失敗，狀態碼:", response.status);
      }

      alert(isApprove ? "🎉 已核准上架" : "❌ 已拒絕申請");
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));

    } catch (err: any) {
      console.error("審核過程錯誤:", err);
      alert("操作失敗: " + err.message);
    }
  };

  // --- 輔助函數 ---
  const getCleanImageUrl = (product: Product) => {
    let raw = product.image_url || product.images;
    if (!raw) return "";
    let urlString = "";
    if (Array.isArray(raw)) urlString = raw[0] || "";
    else if (typeof raw === "string") {
      if (raw.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          urlString = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) { urlString = raw; }
      } else urlString = raw;
    } else urlString = String(raw);

    let clean = urlString.trim().replace(/^\[['"]?/, "").replace(/['"]?\]$/, "").replace(/\\/g, "").replace(/^['"]/, "").replace(/['"]$/, "").trim();
    if (clean.startsWith("http")) return clean;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${clean.replace('product-images/', '')}`;
  };

  if (liffLoading || (isAuthenticated && isLoading && isAdmin)) {
    return <div className="p-10 text-center">後台載入中...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Card className="p-8"><ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-2"/>權限不足</Card>
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
        {pendingProducts.length === 0 ? (
          <p className="text-center py-10 text-slate-400 font-bold">目前沒有待處理商品 ✅</p>
        ) : (
          <div className="space-y-4">
            {pendingProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden bg-white shadow-sm rounded-2xl border-none">
                <div className="aspect-[16/10] bg-slate-100">
                  <img src={getCleanImageUrl(product)} alt={product.name} className="h-full w-full object-cover" />
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
                      className="border-red-200 text-red-600 font-bold rounded-xl h-11"
                    >
                      拒絕
                    </Button>
                    <Button
                      onClick={() => handleReview(product, "approve")}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-11"
                    >
                      核准
                    </Button>
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
