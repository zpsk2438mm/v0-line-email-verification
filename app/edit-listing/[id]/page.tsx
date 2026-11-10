// app/edit-listing/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLiff } from "@/components/liff-provider";
import { ListingForm } from "@/components/listing-form"; // 👈 請根據你專案中表單元件的實際路徑調整
import { Loader2, ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lineUserId, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (liffLoading || !id) return;

    async function fetchProductData() {
      try {
        setLoading(true);
        // 🎯 1. 從資料庫撈出這筆商品的完整欄位
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!data) {
          setErrorMsg("找不到該商品的資料。");
          return;
        }

        // 🎯 2. 安全防線：驗證目前登入的 LINE ID 是否跟商品擁有者相同
        if (data.line_user_id !== lineUserId) {
          setErrorMsg("安全驗證失敗：您沒有權限編輯此商品。");
          setTimeout(() => router.push("/my-listings"), 2500);
          return;
        }

        // 🎯 3. 驗證成功，灌入狀態
        setInitialData(data);
      } catch (err: any) {
        console.error("撈取舊資料失敗:", err);
        setErrorMsg("商品資料讀取失敗，請確認網路連線。");
      } finally {
        setLoading(false);
      }
    }

    if (lineUserId && isAuthenticated) {
      fetchProductData();
    } else if (!liffLoading && !lineUserId) {
      setErrorMsg("請先登入 LINE 帳號再進行操作。");
      setLoading(false);
    } else {
      setErrorMsg("請先完成校園信箱驗證。");
      setLoading(false);
    }
  }, [id, lineUserId, isAuthenticated, liffLoading, router]);

  // 載入中的骨架屏
  if (liffLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-[#D35400]" />
        <p className="text-sm font-black text-slate-500 tracking-wider">正在抓取商品舊資料...</p>
      </div>
    );
  }

  // 錯誤處理畫面
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="bg-rose-50 p-4 rounded-full text-rose-500">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <p className="text-base font-black text-slate-800">{errorMsg}</p>
        <Button 
          onClick={() => !lineUserId ? login() : router.push(!isAuthenticated ? "/" : "/my-listings")}
          className="bg-slate-800 text-white font-bold rounded-xl px-6"
        >
          返回我的商品
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">
      {/* 頂部貼心導覽列 */}
      <div className="max-w-md mx-auto px-4 pt-4 flex items-center">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="text-slate-400 font-bold gap-1 rounded-xl hover:text-slate-600 hover:bg-slate-100/50"
        >
          <ChevronLeft className="h-5 w-5" /> 返回
        </Button>
      </div>

      {/* 🎯 灌入資料：傳送 isEditMode 與撈出來的 initialData 給表單 */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <ListingForm isEditMode={true} initialData={initialData} />
      </div>
    </div>
  );
}
