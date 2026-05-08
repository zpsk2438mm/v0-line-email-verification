"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";

// 🛡️ 管理員 ID 名單
const ADMIN_IDS = ["Uf7c4668bc96315297b02b0a67fff88ea"];

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  is_approved: boolean;
  created_at: string;
  line_user_id: string;
  image_url: any;
}

export default function AdminPage() {
  const { lineUserId, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 驗證權限
  const isAdmin = lineUserId && ADMIN_IDS.includes(lineUserId);

  useEffect(() => {
    if (liffLoading) return;
    
    if (isAuthenticated && isAdmin) {
      fetchPendingProducts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, liffLoading]);

  async function fetchPendingProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPendingProducts(data || []);
    } catch (err) {
      console.error("抓取失敗:", err);
    } finally {
      setLoading(false);
    }
  }

  // 圖片解析函數：解決破圖關鍵
  const getImageUrl = (url: any) => {
    const fallback = "/placeholder-logo.png";
    if (!url) return fallback;
    try {
      // 如果是陣列
      if (Array.isArray(url)) return url[0] || fallback;
      // 如果是字串格式的 JSON 陣列 '["http..."]'
      if (typeof url === 'string' && url.startsWith('[')) {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) ? parsed[0] : fallback;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  async function handleApprove(id: string) {
    try {
      setActionLoading(id);
      const { error } = await supabase
        .from("products")
        .update({ is_approved: true })
        .eq("id", id);
      if (error) throw error;
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("審核失敗");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此商品嗎？")) return;
    try {
      setActionLoading(id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("刪除失敗");
    } finally {
      setActionLoading(null);
    }
  }

  if (liffLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-800">權限不足</h1>
          <p className="text-slate-500">此頁面僅供管理員訪問</p>
          <Button asChild className="bg-[#D35400] text-white rounded-xl px-8 h-12">
            <a href="/">返回首頁</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="bg-slate-900 p-2 rounded-lg">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">管理員審核系統</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-bold text-slate-600">待審核列表 ({pendingProducts.length})</h2>
          <Button onClick={fetchPendingProducts} variant="ghost" size="sm" className="text-[#D35400] font-bold">
            重新整理
          </Button>
        </div>

        {pendingProducts.length === 0 ? (
          <Card className="p-16 text-center border-dashed border-2 border-slate-200 bg-white/50 rounded-[32px]">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 font-medium">目前沒有待審核的商品</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-none shadow-sm rounded-3xl bg-white">
                <div className="p-4 flex gap-4 text-left">
                  {/* 圖片區塊：加入自動解析與預防破圖 */}
                  <div className="h-24 w-24 rounded-2xl bg-orange-50 shrink-0 overflow-hidden border border-orange-100 flex items-center justify-center">
                    {product.image_url ? (
                      <img 
                        src={getImageUrl(product.image_url)} 
                        className="h-full w-full object-cover" 
                        alt="Preview" 
                        onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                      />
                    ) : (
                      <ImageIcon className="text-orange-200 h-8 w-8" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Badge className="mb-1 bg-orange-50 text-[#D35400] border-none text-[10px] px-2 py-0.5">
                        {product.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(product.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate text-base">{product.name}</h3>
                    <p className="text-[#D35400] font-black text-sm mt-1">NT$ {product.price.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{product.description}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 font-bold shadow-sm transition-all"
                  >
                    {actionLoading === product.id ? <Loader2 className="animate-spin h-5 w-5" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    disabled={!!actionLoading}
                    variant="ghost"
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl h-11 font-bold transition-all"
                  >
                    拒絕刪除
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
