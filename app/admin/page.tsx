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

const ADMIN_IDS = ["Uf7c4668bc96315297b02b0a67fff88ea"];

// ⚠️ 請確認你的 Bucket 名稱是否為 "product-images"
const STORAGE_URL = "https://ntubmewovubpzxgsfayp.supabase.co/storage/v1/object/public/product-images/";

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

  // 🛠️ 終極網址解析
  const getImageUrl = (urlData: any) => {
    const fallback = "/placeholder-logo.png";
    if (!urlData) return fallback;

    try {
      let fileName = "";

      // 1. 如果是陣列，取第一個元素
      if (Array.isArray(urlData)) {
        fileName = urlData[0];
      } 
      // 2. 如果是 JSON 字串格式 ["..."]
      else if (typeof urlData === 'string' && urlData.startsWith('[')) {
        const parsed = JSON.parse(urlData);
        fileName = Array.isArray(parsed) ? parsed[0] : urlData;
      } 
      // 3. 一般字串
      else {
        fileName = urlData;
      }

      // 如果 fileName 已經是完整的網址，直接回傳
      if (typeof fileName === 'string' && fileName.startsWith('http')) {
        return fileName.replace(/\\/g, '');
      }

      // 關鍵：如果只是檔案名，幫它加上 Supabase 的完整路徑
      if (fileName && typeof fileName === 'string') {
        // 移除可能存在的引號或括號
        const cleanName = fileName.replace(/[\[\]"']/g, '');
        return `${STORAGE_URL}${cleanName}`;
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
      console.error("Fetch error:", err);
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
      alert("核准失敗");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除嗎？")) return;
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
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold">權限不足</h1>
          <Button asChild className="bg-[#D35400] text-white">
            <a href="/">回首頁</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">待審核列表 ({pendingProducts.length})</h1>
        <Button onClick={fetchPendingProducts} variant="ghost" size="sm" className="ml-auto text-[#D35400] font-bold">
          重新整理
        </Button>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {pendingProducts.length === 0 ? (
          <Card className="p-20 text-center bg-white/50 border-dashed rounded-[32px]">
            <p className="text-slate-400">目前沒有待處理商品</p>
          </Card>
        ) : (
          pendingProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden border-none shadow-md rounded-[32px] bg-white">
              <div className="p-5 flex gap-4">
                <div className="h-24 w-24 rounded-2xl bg-orange-50 shrink-0 overflow-hidden border border-orange-100 flex items-center justify-center">
                  <img 
                    src={getImageUrl(product.image_url)} 
                    className="h-full w-full object-cover" 
                    alt="Product" 
                    onError={(e) => {
                      // 如果拼接後的網址也失敗，就顯示預設圖
                      e.currentTarget.src = "/placeholder-logo.png";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className="bg-orange-50 text-[#D35400] border-none text-[10px] mb-1">
                    {product.category}
                  </Badge>
                  <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                  <p className="text-[#D35400] font-black">NT$ {product.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <Button 
                  onClick={() => handleApprove(product.id)}
                  disabled={!!actionLoading}
                  className="flex-[2] bg-[#00B900] hover:bg-[#009900] text-white rounded-2xl h-12 font-bold"
                >
                  {actionLoading === product.id ? <Loader2 className="animate-spin h-5 w-5" /> : "准許上架"}
                </Button>
                <Button 
                  onClick={() => handleDelete(product.id)}
                  disabled={!!actionLoading}
                  className="flex-1 bg-rose-50 text-rose-500 rounded-2xl h-12 font-bold"
                >
                  拒絕
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
