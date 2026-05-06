"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag,
  User,
  Mail,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  status?: string;
  created_at: string;
  image_url?: any; // 放寬型態以相容字串與陣列
  images?: any;
}

interface UserStats {
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

// 💡 修正完畢：完整的狀態配置物件
const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  approved: { label: "已上架", icon: CheckCircle, color: "text-green-600" },
  pending: { label: "審核中", icon: Clock, color: "text-yellow-600" },
  rejected: { label: "已拒絕", icon: XCircle, color: "text-red-600" },
};

export default function ProfilePage() {
  const { userEmail, lineUserId, isAuthenticated } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalListings: 0,
    pendingListings: 0,
    approvedListings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!lineUserId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user's products from Supabase
        const { data, error: fetchError } = await supabase
          .from("products")
          .select("*")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });

        if (fetchError) {
          console.error("[v0] Failed to fetch products:", fetchError);
          setError("無法載入商品資料");
          return;
        }

        const productList = data || [];
        setProducts(productList);

        // Calculate stats
        const pending = productList.filter(
          (p) => !p.status || p.status === "pending"
        ).length;
        const approved = productList.filter(
          (p) => p.status === "approved"
        ).length;

        setStats({
          totalListings: productList.length,
          pendingListings: pending,
          approvedListings: approved,
        });
      } catch (err) {
        console.error("[v0] Unexpected error:", err);
        setError("發生未預期的錯誤");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [lineUserId]);

  // 💡 核心：個人中心專用的安全圖片路徑解析器
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">請先登入</p>
            <p className="text-sm text-muted-foreground mt-1">
              您需要登入才能查看個人中心
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-4 py-4 shadow-sm">
        <Navigation />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* User Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">帳號資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">南台科大用戶</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{userEmail || "未驗證"}</span>
                </div>
              </div>
            </div>

            {userEmail && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">學校信箱已驗證</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalListings}
                </p>
              )}
              <p className="text-xs text-muted-foreground">總上架數</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendingListings}
                </p>
              )}
              <p className="text-xs text-muted-foreground">審核中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-green-600">
                  {stats.approvedListings}
                </p>
              )}
              <p className="text-xs text-muted-foreground">已上架</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Listings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近上架商品</CardTitle>
              <Link href="/my-listings">
                <Button variant="ghost" size="sm" className="text-xs">
                  查看全部
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  您還沒有上架任何商品
                </p>
                <Link href="/">
                  <Button size="sm">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    立即上架
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((product) => {
                  const status = product.status || "pending";
                  const statusConfig =
                    STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  // 使用去污染解析器獲取安全的網址
                  const imageUrl = getCleanImageUrl(product);

                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error("個人中心縮圖載入失敗，網址:", imageUrl);
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-5 w-5 text-muted-foreground/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg></div>';
                              }
                            }}
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary font-medium">
                            NT${product.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div
                        className={`flex items-center gap-1 shrink-0 ${statusConfig.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">{statusConfig.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Home */}
        <Link href="/" className="block">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
