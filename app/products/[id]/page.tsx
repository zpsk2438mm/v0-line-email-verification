"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { use(params); } // ... 其他 import

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState("");

  useEffect(() => {
    async function getData() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) setErrorInfo(error.message);
      if (data) setProduct(data);
    }
    getData();
  }, [id]);

  if (!product) return <div className="p-20 text-center">搜尋 ID: {id} <br/> 狀態：尚未抓到資料 {errorInfo}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{product.name}</h1>
      {/* 這裡要確保欄位名稱跟資料庫 一樣 */}
      <p>價格：{product.price}</p>
      <p>狀態：{product.is_approved ? "✅ 已核准" : "❌ 待核准"}</p>
      <pre className="bg-slate-100 p-4 mt-4 text-xs">
        {JSON.stringify(product, null, 2)} {/* 👈 這行會把資料庫所有欄位印出來讓你檢查 */}
      </pre>
    </div>
  );
}
