"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        // 只抓取已核准 (is_approved: true) 的商品
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_approved", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("抓取列表失敗:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // 解析圖片 (針對你的 age_url 欄位修正)
  const getImageUrl = (item: any) => {
    const url = item.age_url || item.image_url;
    if (!url) return "/placeholder-logo.png";
    if (typeof url === "string" && url.startsWith("[")) {
      try { return JSON.parse(url)[0]; } catch { return url; }
    }
    return url;
  };

  if (loading) return <div className="p-10 text-center">載入中...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800">STUST 二手市場</h1>
        <Link href="/upload"><Button>我要上架</Button></Link>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          /* ✨ 重點：使用 Link 包裹整個卡片或是按鈕 */
          <div key={product.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className="aspect-square bg-slate-100">
              <img src={getImageUrl(product)} alt={product.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="p-4">
              <Badge variant="outline" className="mb-1 text-[10px]">{product.category}</Badge>
              <h2 className="font-bold text-slate-800 truncate">{product.name}</h2>
              <p className="text-rose-500 font-black mt-1">NT$ {product.price}</p>
              
              {/* ✨ 重點：Link 的 href 必須指向 /products/ID */}
              <Link href={`/products/${product.id}`}>
                <Button className="w-full mt-3 bg-slate-800 hover:bg-slate-700 rounded-xl">
                  查看詳情
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 text-slate-400">目前還沒有商品上架喔！</div>
      )}
    </main>
  );
}
