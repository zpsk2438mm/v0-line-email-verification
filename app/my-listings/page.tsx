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
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  contact: string;
  status?: string;
  created_at: string;
  image_url?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  approved: { label: "已上架", icon: CheckCircle, variant: "default" },
  pending: { label: "審核中", icon: Clock, variant: "secondary" },
  rejected: { label: "已拒絕", icon: XCircle, variant: "destructive" },
};

export default function MyListingsPage() {
  const { lineUserId, isAuthenticated } = useLiff();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      if (!lineUserId) {
        setIsLoading(false);
        return;
      }

      try {
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

        setProducts(data || []);
      } catch (err) {
        console.error("[v0] Unexpected error:", err);
        setError("發生未預期的錯誤");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [lineUserId]);

  const handleDelete = async (productId: string) => {
    if (!confirm("確定要刪除這個商品嗎？此操作無法復原。")) {
      return;
    }

    setDeletingId(productId);

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("line_user_id", lineUserId);

      if (deleteError) {
        console.error("[v0] Failed to delete product:", deleteError);
        alert("刪除失敗，請稍後再試");
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("[v0] Unexpected error:", err);
      alert("發生未預期的錯誤");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">請先登入</p>
            <p className="text-sm text-muted-foreground mt-1">
              您需要登入才能查看我的商品
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
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold">我的商品</h1>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-24 w-24 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                還沒有上架任何商品
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                開始上架您的二手商品吧！
              </p>
              <Link href="/">
                <Button>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  立即上架
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((product) => {
              const status = product.status || "pending";
              const statusConfig =
                STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;
              const isDeleting = deletingId === product.id;

              return (
                <Card key={product.id} className={isDeleting ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {product.image_url && product.image_url.length > 0 ? (
                          <img
                            src={product.image_url[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {product.name}
                          </h3>
                          <Badge variant={statusConfig.variant} className="shrink-0">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <p className="text-lg font-bold text-primary mt-1">
                          NT${product.price.toLocaleString()}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>
                            {CATEGORY_LABELS[product.category] || product.category}
                          </span>
                          <span>-</span>
                          <span>{formatDate(product.created_at)}</span>
                        </div>

                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(product.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            刪除
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Back to Home */}
        <Link href="/" className="block pt-4">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
