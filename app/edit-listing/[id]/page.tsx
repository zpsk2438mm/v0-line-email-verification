// app/edit-listing/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/liff-provider";
import { ListingForm } from "@/components/listing-form"; // 確保路徑指向你的 ListingForm 檔案
import { Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lineUserId, isLoading: liffLoading } = useLiff();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (liffLoading || !id) return;

    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        // 安全防護：如果這件商品不是目前 LINE 使用者的，直接踢回首頁防止惡意竄改
        if (data.line_user_id !== lineUserId) {
          alert("您沒有權限編輯此商品");
          router.push("/my-listings");
          return;
        }

        setInitialData(data);
      } catch (err) {
        console.error("載入商品失敗:", err);
        alert("找不到該商品或讀取失敗");
        router.push("/my-listings");
      } finally {
        setLoading(false);
      }
    }

    if (lineUserId) fetchProduct();
  }, [id, lineUserId, liffLoading, router]);

  if (liffLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#D95300]" />
        <p className="text-sm font-bold text-gray-500">正在讀取商品資料...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* 頂部回上一頁的貼心控制列 */}
      <div className="max-w-md mx-auto px-4 pt-4 flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-slate-500 font-bold gap-1 rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" /> 返回我的商品
        </Button>
      </div>

      {/* 將撈出來的舊資料作為 prop 砸進表單元件 */}
      <ListingForm isEditMode={true} initialData={initialData} />
    </div>
  );
}
