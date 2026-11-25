
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { contactRequest } from "@/lib/contact-client";
import { useLiff } from "@/components/liff-provider";
import ListingForm from "@/components/listing-form";
import {
  Loader2,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ==========================================
// 允許編輯的商品狀態
// ==========================================

const EDITABLE_STATUSES = [
  "pending",
  "approved",
];

// ==========================================
// 商品資料格式
// ==========================================

interface ProductData {
  id: string;
  name: string;
  title?: string;
  category: string;
  condition: string | null;
  price: number;
  description: string | null;
  contact?: string;
  image_url: string | null;
  images?: string[];
  status: string;
  is_approved: boolean;
  created_at?: string;
  approved_at?: string | null;
}

// ==========================================
// 驗證商品 ID 格式
// ==========================================

function validUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ==========================================
// 編輯商品頁面
// ==========================================

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : "";

  const {
    lineUserId,
    userEmail,
    isAuthenticated,
    login,
    isLoading: liffLoading,
  } = useLiff();

  const [initialData, setInitialData] =
    useState<ProductData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [loadedRequestKey, setLoadedRequestKey] =
    useState("");

  // ==========================================
  // 建立目前登入者的身分識別
  // 防止切換帳號後顯示前一位使用者的商品
  // ==========================================

  const identityKey =
    lineUserId &&
    userEmail &&
    isAuthenticated
      ? `${lineUserId}:${userEmail.toLowerCase()}`
      : "";

  const requestKey =
    `${identityKey}:${id}`;

  // ==========================================
  // 透過安全 API 讀取商品資料
  // ==========================================

  useEffect(() => {
    if (liffLoading) return;

    let cancelled = false;

    setInitialData(null);
    setErrorMsg("");
    setLoading(true);
    setLoadedRequestKey("");

    // ========================================
    // 1. 驗證商品 ID
    // ========================================

    if (!id || !validUUID(id)) {
      setErrorMsg(
        "商品 ID 格式不正確。"
      );

      setLoadedRequestKey(requestKey);
      setLoading(false);

      return;
    }

    // ========================================
    // 2. 確認 LINE 登入
    // ========================================

    if (!lineUserId) {
      setErrorMsg(
        "請先登入 LINE 帳號再進行操作。"
      );

      setLoadedRequestKey(requestKey);
      setLoading(false);

      return;
    }

    // ========================================
    // 3. 確認校園信箱驗證
    // ========================================

    if (!isAuthenticated || !userEmail) {
      setErrorMsg(
        "請先完成校園信箱驗證。"
      );

      setLoadedRequestKey(requestKey);
      setLoading(false);

      return;
    }

    // ========================================
    // 4. 讀取私人商品資料
    // ========================================

    async function fetchProductData() {
      try {
        const result = await contactRequest(
          `/api/my-products/${encodeURIComponent(id)}`,
          "GET"
        );

        if (cancelled) return;

        if (
          !result?.success ||
          !result.product
        ) {
          throw new Error(
            result?.error ||
              "找不到該商品的資料。"
          );
        }

        const product =
          result.product as ProductData;

        // ====================================
        // 5. 確認回傳商品 ID 正確
        // ====================================

        if (product.id !== id) {
          throw new Error(
            "商品資料驗證失敗，請重新整理後再試。"
          );
        }

        // ====================================
        // 6. 禁止編輯檢舉中的商品
        // ====================================

        if (product.status === "reported") {
          throw new Error(
            "此商品正在進行檢舉審核，暫時無法編輯。"
          );
        }

        // ====================================
        // 7. 禁止編輯違規下架商品
        // ====================================

        if (product.status === "removed") {
          throw new Error(
            "此商品已因違規下架，如有疑問請聯絡管理員。"
          );
        }

        // ====================================
        // 8. 驗證商品是否允許編輯
        // ====================================

        if (
          !EDITABLE_STATUSES.includes(
            product.status
          )
        ) {
          throw new Error(
            "目前商品狀態不允許編輯。"
          );
        }

        // ====================================
        // 9. 保留原始商品資料
        //
        // 不修改原始 image_url
        // 避免舊商品圖片驗證失敗
        // ====================================

        setInitialData(product);

        setLoadedRequestKey(requestKey);

      } catch (err) {
        if (cancelled) return;

        console.error(
          "撈取舊商品資料失敗:",
          err
        );

        setInitialData(null);

        setErrorMsg(
          err instanceof Error
            ? err.message
            : "商品資料讀取失敗，請確認網路連線。"
        );

        setLoadedRequestKey(requestKey);

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProductData();

    // ========================================
    // 防止切換頁面或帳號後
    // 舊請求覆蓋目前商品資料
    // ========================================

    return () => {
      cancelled = true;
    };

  }, [
    id,
    lineUserId,
    userEmail,
    isAuthenticated,
    liffLoading,
    requestKey,
  ]);

  // ==========================================
  // 錯誤畫面的返回操作
  // ==========================================

  const handleReturn = () => {
    if (!lineUserId) {
      login();
      return;
    }

    if (!isAuthenticated || !userEmail) {
      const nextPath =
        `/edit-listing/${encodeURIComponent(id)}`;

      router.push(
        `/?next=${encodeURIComponent(nextPath)}`
      );

      return;
    }

    router.push("/my-listings");
  };

  // ==========================================
  // 載入畫面
  // 保留原本 UI
  // ==========================================

  if (
    liffLoading ||
    loading ||
    loadedRequestKey !== requestKey
  ) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-3">

        <Loader2 className="h-9 w-9 animate-spin text-[#D35400]" />

        <p className="text-sm font-black text-slate-500 tracking-wider">
          正在抓取商品舊資料...
        </p>

      </div>
    );
  }

  // ==========================================
  // 錯誤處理畫面
  // 保留原本 UI
  // ==========================================

  if (errorMsg || !initialData) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center gap-4">

        <div className="bg-rose-50 p-4 rounded-full text-rose-500">

          <AlertTriangle className="h-10 w-10" />

        </div>

        <p className="text-base font-black text-slate-800 break-words">

          {errorMsg ||
            "找不到該商品的資料。"}

        </p>

        <Button
          onClick={handleReturn}
          className="bg-slate-800 text-white font-bold rounded-xl px-6"
        >

          {!lineUserId
            ? "使用 LINE 登入"
            : !isAuthenticated || !userEmail
              ? "前往校園信箱驗證"
              : "返回我的商品"}

        </Button>

      </div>
    );
  }

  // ==========================================
  // 商品編輯畫面
  // 保留原本 UI 及 ListingForm
  // ==========================================

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">

      {/* 頂部導覽列 */}

      <div className="max-w-md mx-auto px-4 pt-4 flex items-center">

        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-400 font-bold gap-1 rounded-xl hover:text-slate-600 hover:bg-slate-100/50"
        >

          <ChevronLeft className="h-5 w-5" />

          返回

        </Button>

      </div>

      {/* 商品編輯表單 */}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

        <ListingForm
          key={requestKey}
          isEditing={true}
          initialData={initialData}
        />

      </div>

    </div>
  );
}
