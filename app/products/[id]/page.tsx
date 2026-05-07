"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
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

  // --- 封裝統一的標頭，使用橘色強調 ---
  const Header = ({ title }: { title: string }) => (
    <header className="p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-50 shadow-sm">
      <Navigation />
      <Link href="/products">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-500 hover:text-[#D95300] hover:bg-orange-50">
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="h-6 w-[1px] bg-gray-100 mx-1" />
      <span className="font-bold truncate text-gray-800">{title}</span>
    </header>
  );

  // 載入中的顏色改為橘色系
  if (loading) return <div className="p-10 text-center animate-pulse text-orange-300 font-bold">讀取商品資訊中...</div>;

  if (!product) return (
    <main className="min-h-screen bg-[#F9F8F6]">
      <Header title="找不到商品" />
      <div className="p-10 max-w-md mx-auto mt-10 text-center bg-white rounded-3xl shadow-xl border border-orange-100">
        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">哎呀！抓不到資料</h2>
        <p className="text-sm text-gray-500 mb-6">嘗試 ID: <code className="bg-orange-50 px-1 rounded text-[#D95300]">{id}</code></p>
        <div className="text-xs text-orange-600 bg-orange-50 p-4 rounded-xl mb-6 text-left border border-orange-100">
          <strong>除錯訊息：</strong> {errorMsg || "無具體錯誤，但回傳值為空。"}
        </div>
        <Link href="/">
          <Button className="w-full bg-[#D95300] hover:bg-[#B84600] text-white rounded-xl h-12 font-bold shadow-lg shadow-orange-100">
            返回首頁重試
          </Button>
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F9F8F6] pb-20">
      <Header title={product.name} />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 商品圖片 */}
        <div className="aspect-square rounded-3xl overflow-hidden border border-white bg-white shadow-md">
          <img src={getImageUrl(product)} className="w-full h-full object-cover" alt="商品圖片" />
        </div>

        {/* 商品資訊卡片 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50">
          <div className="flex justify-between items-center mb-4">
            <Badge className={product.is_approved ? "bg-emerald-50 text-emerald-600 border-none" : "bg-orange-50 text-orange-600 border-none"}>
              {product.is_approved ? "✅ 已核准上架" : "⏳ 審核中"}
            </Badge>
            <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-md">
              類別：{product.category || "未分類"}
            </span>
          </div>
          
          <h1 className="text-2xl font-black text-gray-800 mb-2">{product.name}</h1>
          <p className="text-[#D95300] text-3xl font-black mb-4">NT$ {product.price?.toLocaleString()}</p>
          
          <div className="h-px bg-gray-50 mb-4" />
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {product.description || "這件商品還沒有詳細描述。"}
          </p>
        </div>

        {/* 聯絡資訊卡片 - 使用深色背景突顯橘色文字 */}
        <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-[#D95300]">
          <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest mb-2">聯絡方式 (LINE/Email)</p>
          <p className="text-lg font-mono tracking-tight break-all font-bold">
             {product.contact || product.verified_email || "未提供聯絡資訊"}
          </p>
        </div>

        {/* 下方 Debug 資訊 */}
        <details className="mt-10 opacity-20 hover:opacity-100 transition-opacity">
          <summary className="text-[10px] text-gray-400 cursor-pointer text-center">檢視系統資料</summary>
          <pre className="text-[10px] bg-white p-4 rounded-2xl border border-gray-100 mt-2 overflow-auto shadow-inner">
            {JSON.stringify(product, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}
