"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
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
        // 使用 maybeSingle 避免找不到資料時直接噴錯
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

  // 🖼️ 處理圖片路徑：自動嘗試 age_url 或 image_url
  const getImageUrl = (item: any) => {
    const url = item?.age_url || item?.image_url; // 👈 同時檢查兩個可能的欄位名
    if (!url) return "/placeholder-logo.png";
    try {
      const parsed = (typeof url === "string" && url.startsWith("[")) ? JSON.parse(url) : url;
      return Array.isArray(parsed) ? parsed[0] : url;
    } catch {
      return url;
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">讀取中...</div>;

  // ❌ 錯誤診斷畫面
  if (!product) return (
    <div className="p-10 max-w-md mx-auto mt-20 text-center bg-white rounded-3xl shadow-xl border border-rose-100">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">哎呀！抓不到資料</h2>
      <p className="text-sm text-slate-500 mb-6">嘗試 ID: <code className="bg-slate-100 px-1 rounded">{id}</code></p>
      <div className="text-xs text-rose-400 bg-rose-50 p-4 rounded-xl mb-6 text-left">
        <strong>除錯訊息：</strong> {errorMsg || "無具體錯誤，但回傳值為空。"}
      </div>
      <Link href="/"><Button className="w-full bg-slate-800 rounded-xl">返回首頁重試</Button></Link>
    </div>
  );

  // ✅ 成功抓到資料後的畫面
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-50">
        <Link href="/"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <span className="font-bold truncate">{product.name}</span>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 商品圖片 */}
        <div className="aspect-square rounded-3xl overflow-hidden border bg-white shadow-sm">
          <img src={getImageUrl(product)} className="w-full h-full object-cover" alt="商品圖片" />
        </div>

        {/* 商品資訊 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <Badge className={product.is_approved ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}>
              {product.is_approved ? "✅ 已核准上架" : "⏳ 審核中"}
            </Badge>
            <span className="text-[10px] text-slate-400">類別：{product.category || "未分類"}</span>
          </div>
          
          <h1 className="text-2xl font-black text-slate-800 mb-2">{product.name}</h1>
          <p className="text-rose-500 text-3xl font-black mb-4">NT$ {product.price?.toLocaleString()}</p>
          
          <div className="h-px bg-slate-100 mb-4" />
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {product.description || "這件商品還沒有詳細描述。"}
          </p>
        </div>

        {/* 聯絡資訊 */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
          <p className="text-blue-400 font-bold text-xs mb-2">聯絡方式 (LINE/Email)</p>
          <p className="text-lg font-mono tracking-tight break-all">
             {product.contact || product.verified_email || "未提供聯絡資訊"}
          </p>
        </div>

        {/* 開發者專用：檢視原始資料 (上線前可刪除) */}
        <details className="mt-10">
          <summary className="text-[10px] text-slate-300 cursor-pointer">檢視原始 JSON 資料</summary>
          <pre className="text-[10px] bg-white p-4 rounded border mt-2 overflow-auto">
            {JSON.stringify(product, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}
