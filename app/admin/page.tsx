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
  XCircle, 
  ExternalLink, 
  Loader2,
  AlertCircle
} from "lucide-react";

// 管理員信箱名單
const ADMIN_EMAILS = ["你的管理員信箱@gmail.com"];

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
  const { userEmail, isAuthenticated, isLoading: liffLoading } = useLiff();
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);

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
      console.error("抓取待審核商品失敗:", err);
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
          <p className="text-slate-500">此頁面僅供系統管理員訪問</p>
          <Button asChild className="bg-[#D35400] text-white rounded-xl">
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
        <h1 className="text-lg font-bold text-slate-800">管理員審核</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-bold text-slate-600">待審核列表 ({pendingProducts.length})</h2>
          <Button onClick={fetchPendingProducts} variant="ghost" size="sm" className="text-[#D35400] text-xs">
            重新整理
          </Button>
        </div>

        {pendingProducts.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-white/50 rounded-[32px]">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-slate-400 font-medium">目前沒有待審核的商品</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-none shadow-sm rounded-3xl bg-white">
                <div className="p-4 flex gap-4">
                  <div className="h-24 w-24 rounded-2xl bg-orange-50 shrink-0 overflow-hidden border border-orange-100">
                    {product.image_url ? (
                      <img 
                        src={Array.isArray(product.image_url) ? product.image_url[0] : product.image_url} 
                        className="h-full w-full object-cover" 
                        alt="Preview" 
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><AlertCircle className="text-orange-200" /></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Badge className="mb-1 bg-orange-50 text-[#D35400] border-none hover:bg-orange-50 text-[10px]">
                        {product.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {new Date(product.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                    <p className="text-[#D35400] font-black text-sm">NT$ {product.price.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">{product.description}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                  <Button 
                    onClick={() => handleApprove(product.id)}
                    disabled={!!actionLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-11 font-bold shadow-sm"
                  >
                    {actionLoading === product.id ? <Loader2 className="animate-spin" /> : "准許上架"}
                  </Button>
                  <Button 
                    onClick={() => handleDelete(product.id)}
                    disabled={!!actionLoading}
                    variant="ghost"
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl h-11 font-bold"
                  >
                    拒絕並刪除
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
