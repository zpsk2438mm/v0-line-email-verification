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

  // 【最強圖片解析邏輯】
  const getImageUrl = (urlData: any) => {
    const fallback = "/placeholder-logo.png";
    if (!urlData) return fallback;

    try {
      // 1. 先處理標準格式
      if (Array.isArray(urlData) && urlData.length > 0) return urlData[0];
      if (typeof urlData === 'string' && urlData.startsWith('http') && !urlData.startsWith('[')) return urlData;

      // 2. 暴力挖取法：將內容轉為字串，用正規表達式尋找第一個 http 網址
      const strData = typeof urlData === 'string' ? urlData : JSON.stringify(urlData);
      // 這個 Regular Expression 會尋找 https:// 直到遇到引號或括號結束，並處理掉反斜線 \/
      const match = strData.match(/https?:\/\/[^"\'\]\}]+/);
      
      if (match) {
        return match[0].replace(/\\/g, ''); // 移除轉義的反斜線
      }
      
      return fallback;
    } catch (e) {
      return fallback;
    }
  };

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
          <Button asChild className="bg-[#D35400] text-white rounded-xl px-10 h-12">
            <a href="/">返回首頁</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20 text-slate-800">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <div className="bg-slate-900 p-2 rounded-lg">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold">待審核清單</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-slate-500">當前共有 {pendingProducts.length} 筆待處理</h2>
          <Button onClick={fetchPendingProducts} variant="ghost" size="sm" className="text-[#D35400] font-bold">
            重新整理
          </Button>
        </div>

        {pendingProducts.length === 0 ? (
          <Card className="p-16 text-center border-dashed border-2 border-slate-200 bg-white/50 rounded-[32px]">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 font-medium">目前太乾淨了，沒有商品要審核</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-none shadow-lg rounded-[32px] bg-white">
                <div className="p-6 flex flex-row gap-5 text-left">
                  {/* 圖片展示區 */}
                  <div className="h-28 w-28 rounded-[24px] bg-orange-50 shrink-0 overflow-hidden border border-orange-100 flex items-center justify-center shadow-inner">
                    <img 
                      src={getImageUrl(product.image_url)} 
                      className="h-full w-full object-cover" 
                      alt="Product" 
                      onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Badge className="mb-2 bg-orange-50 text-[#D35400] border-none text-[10px] px-2.5 py-1 font-bold">
                        {product.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {new Date(product.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg truncate">{product.name}</h3>
                    <p className="text-[#D35400] font-black text-lg mt-0.5">NT$ {product.price.toLocaleString()}</p>
                    {product.description && (
                       <p className="text-xs text-slate-500 line-clamp-1 mt-2 bg-slate-50 p-1.5 rounded-lg italic">
                         "{product.description}"
                       </p>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    disabled={!!actionLoading}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-12 font-black shadow-md shadow-emerald-100 active:scale-95 transition-transform"
                  >
                    {actionLoading === product.id ? <Loader2 className="animate-spin h-5 w-5" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl h-12 font-bold border-none active:scale-95 transition-transform"
                  >
                    拒絕
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
