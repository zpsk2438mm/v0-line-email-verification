"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation"; // 👈 引入導覽組件
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          setErrorMsg(error.message);
        } else if (!data) {
          setErrorMsg("資料庫中完全找不到這筆 ID。請確認該商品是否已被刪除，或 ID 是否正確。");
        } else {
          setProduct(data);
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const getImageUrl = (item: any) => {
    const url = item?.age_url || item?.image_url;
    if (!url) return "/placeholder-logo.png";
    try {
      const parsed = (typeof url === "string" && url.startsWith("[")) ? JSON.parse(url) : url;
      return Array.isArray(parsed) ? parsed[0] : url;
    } catch {
      return url;
    }
  };

  // --- 封裝統一的標頭，確保錯誤畫面與成功畫面一致 ---
  const Header = ({ title }: { title: string }) => (
    <header className="p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-50">
      <Navigation /> {/* 👈 漢堡選單 */}
      <Link href="/products">
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="h-6 w-[1px] bg-slate-200 mx-1" /> {/* 分隔線 */}
      <span className="font-bold truncate text-slate-800">{title}</span>
    </header>
  );

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">讀取中...</div>;

  if (!product) return (
    <main className="min-h-screen bg-slate-50">
      <Header title="找不到商品" />
      <div className="p-10 max-w-md mx-auto mt-10 text-center bg-white rounded-3xl shadow-xl border border-rose-100">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">哎呀！抓不到資料</h2>
        <p className="text-sm text-slate-500 mb-6">嘗試 ID: <code className="bg-slate-100 px-1 rounded">{id}</code></p>
        <div className="text-xs text-rose-400 bg-rose-50 p-4 rounded-xl mb-6 text-left">
          <strong>除錯訊息：</strong> {errorMsg || "無具體錯誤，但回傳值為空。"}
        </div>
        <Link href="/"><Button className="w-full bg-slate-800 rounded-xl">返回首頁重試</Button></Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <Header title={product.name} />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 商品圖片 */}
        <div className="aspect-square rounded-3xl overflow-hidden border bg-white shadow-sm">
          <img src={getImageUrl(product)} className="w-full h-full object-cover" alt="商品圖片" />
        </div>

        {/* 商品資訊 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <Badge className={product.is_approved ? "bg-green-100 text-green-600 shadow-none border-none" : "bg-amber-100 text-amber-600 shadow-none border-none"}>
              {product.is_approved ? "✅ 已核准上架" : "⏳ 審核中"}
            </Badge>
            <span className="text-[10px] text-slate-400 font-medium">類別：{product.category || "未分類"}</span>
          </div>
          
          <h1 className="text-2xl font-black text-slate-800 mb-2">{product.name}</h1>
          <p className="text-blue-600 text-3xl font-black mb-4">NT$ {product.price?.toLocaleString()}</p>
          
          <div className="h-px bg-slate-100 mb-4" />
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {product.description || "這件商品還沒有詳細描述。"}
          </p>
        </div>

        {/* 聯絡資訊 */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
          <p className="text-blue-400 font-bold text-[10px] uppercase tracking-wider mb-2">聯絡方式 (LINE/Email)</p>
          <p className="text-lg font-mono tracking-tight break-all">
             {product.contact || product.verified_email || "未提供聯絡資訊"}
          </p>
        </div>

        <details className="mt-10 opacity-30 hover:opacity-100 transition-opacity">
          <summary className="text-[10px] text-slate-300 cursor-pointer">檢視原始 JSON 資料</summary>
          <pre className="text-[10px] bg-white p-4 rounded border mt-2 overflow-auto">
            {JSON.stringify(product, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}
