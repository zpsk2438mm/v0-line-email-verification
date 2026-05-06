"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast"; // 如果沒有這個 hook，我們會用普通的 alert 代替
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Package,
  Calendar,
  Mail,
  User,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  status?: string;
  created_at: string;
  image_url?: any;
  images?: any;
  line_user_id?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

// 🔒 💡 管理員 LINE ID 白名單 (請在下方陣列中加入你跟其他管理員的 LINE User ID)
// 你可以在「個人中心」的最下方看到你自己的 LINE ID (前六碼)，或者在資料庫裡找。
const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df", // 👈 替換成你真正的 LINE User ID (極重要！)
  "YOUR_LINE_USER_ID_HERE",           // 👈 可以放入第二個管理員的 ID
];

export default function AdminReviewPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. 驗證管理員身份
  useEffect(() => {
    if (!liffLoading && isAuthenticated && lineUserId) {
      // 檢查目前的 LINE ID 是否在白名單中
      if (ADMIN_LINE_IDS.includes(lineUserId)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [lineUserId, isAuthenticated, liffLoading]);

  // 2. 獲取所有待審核商品
  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    async function fetchPendingProducts() {
      try {
        setIsLoading(true);
        // 抓取狀態為 pending 或者是 status 為 null 的待審核商品
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or("status.eq.pending,status.is.null")
          .order("created_at", { ascending: true }); // 先刊登的先審核

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

  // 💡 審核動作：更新 Supabase 中的 status
  const handleReview = async (productId: string, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: action })
        .eq("id", productId);

      if (error) {
        alert("操作失敗，請重試！");
        console.error(error);
        return;
      }

      // 從畫面上移除已被審核的商品
      setPendingProducts((prev) => prev.filter((p) => p.id !== productId));
      alert(action === "approved" ? "🎉 商品已核准上架！" : "❌ 已拒絕該商品上架。");
    } catch (err) {
      console.error("更新審核狀態出錯:", err);
    }
  };

  // 💡 終極防污染圖片路徑解析器
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
          if (Array.isArray(parsed)) {
            urlString = parsed[0] || "";
          } else {
            urlString = parsed;
          }
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

    let clean = urlString
      .trim()
      .replace(/^\[['"]?/, "")
      .replace(/['"]?\]$/, "")
      .replace(/\\/g, "")
      .replace(/^['"]/, "")
      .replace(/['"]$/, "")
      .trim();

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return clean;
    } else {
      const cleanPath = clean.replace(/^\//, "");
      if (cleanPath.startsWith("product-images/")) {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/${cleanPath}`;
      } else {
        return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${cleanPath}`;
      }
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

  // 門神 1：載入中
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

  // 門神 2：非管理員（權限不足）
  if (!isAuthenticated || !isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
          <Navigation />
          <h1 className="text-lg font-bold text-slate-800">系統管理後台</h1>
        </header>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-none shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-8 pb-8 text-center space-y-4 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mx-auto">
                <ShieldAlert className="h-8 w-8 text-red-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-slate-800">
                  ⚠️ 存取權限不足
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  本頁面僅限系統管理員進入。若您是開發人員，請確認您的 LINE User ID 已加入程式碼中的白名單中。
                </p>
              </div>
              {lineUserId && (
                <div className="bg-slate-100 p-2.5 rounded-lg text-[10px] text-slate-500 select-all font-mono">
                  您的 ID: {lineUserId}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ✅ 已通過身份驗證：顯示待審核列表
  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-100">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800">商品審核中心</h1>
          <p className="text-[10px] text-indigo-600 font-medium">系統管理員專屬</p>
        </div>
      </header>

      {/* 待審核列表 */}
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-500" />
            待處理商品 ({pendingProducts.length})
          </h3>
        </div>

        {pendingProducts.length === 0 ? (
          <Card className="py-16 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl">
            <CardContent className="space-y-3">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">太棒了，目前沒有待審核商品！</p>
              <p className="text-xs text-slate-400">所有同學提交的物件均已處理完畢。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingProducts.map((product) => {
              const imageUrl = getCleanImageUrl(product);

              return (
                <Card key={product.id} className="overflow-hidden bg-white border-none shadow-sm rounded-2xl">
                  {/* 商品圖片與分類標記 */}
                  <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-100"><svg class="h-8 w-8 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <Package className="h-12 w-12 text-slate-300" />
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/95 text-slate-700 font-bold hover:bg-white text-xs shadow-sm border-none">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </Badge>
                    </div>
                  </div>

                  {/* 商品詳細資訊 */}
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-base text-slate-800 line-clamp-2">
                          {product.name}
                        </h4>
                        <span className="text-lg font-black text-rose-500 shrink-0">
                          NT$ {product.price.toLocaleString()}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* 上架時間與上架人 (如果有) */}
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400 border-t pt-2.5 border-dashed border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        申請時間：{formatDate(product.created_at)}
                      </span>
                    </div>

                    {/* 審核操作按鈕 (打勾與打叉) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        onClick={() => handleReview(product.id, "rejected")}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl h-11"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        拒絕上架
                      </Button>
                      <Button
                        onClick={() => handleReview(product.id, "approved")}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-11 shadow-sm shadow-emerald-100"
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
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
