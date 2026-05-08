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

// 🛡️ 你的管理員 ID
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

  const isAdmin = lineUserId && ADMIN_IDS.includes(lineUserId);

  useEffect(() => {
    if (liffLoading) return;
    if (isAuthenticated && isAdmin) {
      fetchPendingProducts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, liffLoading]);

  // 核心：解析圖片網址，解決 ["url"] 格式導致的破圖
  const getImageUrl = (urlData: any) => {
    const fallback = "/placeholder-logo.png";
    if (!urlData) return fallback;

    try {
      // 如果已經是陣列，取第一個
      if (Array.isArray(urlData)) return urlData[0] || fallback;
      
      // 如果是字串，檢查是不是 JSON 格式的陣列 (例如 '["http..."]')
      if (typeof urlData === 'string') {
        if (urlData.startsWith('[')) {
          const parsed = JSON.parse(urlData);
          return Array.isArray(parsed) ? parsed[0] : fallback;
        }
        return urlData; // 普通字串網址
      }
      return fallback;
    } catch (e) {
      console.error("解析圖片路徑失敗", e);
      return fallback;
    }
  };

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
      console.error("抓取資料失敗:", err);
    } finally {
      setLoading(false);
    }
  }

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
      alert("操作失敗");
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
          <Button asChild className="bg-[#D35400] text-white rounded-xl px-10 h-12 shadow-md">
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
        <h1 className="text-lg font-bold text-slate-800">待審核商品</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
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
          <div className="grid gap-5">
            {pendingProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-none shadow-md rounded-[32px] bg-white">
                <div className="p-5 flex gap-5 text-left">
                  {/* 圖片解析區塊 */}
                  <div className="h-28 w-28 rounded-[24px] bg-orange-50 shrink-0 overflow-hidden border border-orange-100 flex items-center justify-center">
                    <img 
                      src={getImageUrl(product.image_url)} 
                      className="h-full w-full object-cover" 
                      alt="商品圖" 
                      onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Badge className="mb-2 bg-orange-50 text-[#D35400] border-none text-[10px] px-2 py-0.5 font-bold">
                        {product.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(product.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate text-lg">{product.name}</h3>
                    <p className="text-[#D35400] font-black text-base mt-1">NT$ {product.price.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-2">{product.description}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 flex gap-3">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    disabled={!!actionLoading}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-12 font-bold shadow-sm"
                  >
                    {actionLoading === product.id ? <Loader2 className="animate-spin h-5 w-5" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl h-12 font-bold border-none"
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
