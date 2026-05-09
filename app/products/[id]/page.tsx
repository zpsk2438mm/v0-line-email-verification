// app/products/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProductDetailPage() {
  const { id } = useParams(); // 取得網址上的 UUID
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    async function getDetail() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      setProduct(data);
    }
    if (id) getDetail();
  }, [id]);

  if (!product) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="max-w-md mx-auto p-4">
      {/* 這裡才是商品詳情 */}
      <img src={product.image_url} className="w-full rounded-2xl" />
      <h1 className="text-2xl font-bold mt-4">{product.name}</h1>
      <p className="text-[#D35400] text-xl font-bold">NT$ {product.price}</p>
      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
        <p className="text-slate-600">{product.description}</p>
      </div>
      <button className="w-full bg-[#D35400] text-white py-4 rounded-xl mt-6 font-bold">
        聯繫賣家
      </button>
    </div>
  );
}
