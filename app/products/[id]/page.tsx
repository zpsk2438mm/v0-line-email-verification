
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { contactRequest } from "@/lib/contact-client";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { useLiff } from "@/components/liff-provider";
import ReportProductDialog from "@/components/report-product-dialog";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  Calendar,
  Tag,
  AlertCircle,
  PackageCheck,
  Flag,
} from "lucide-react";
import { toast } from "sonner";

// ==========================================
// 公開商品資料格式
// 不包含賣家 LINE ID 及校園信箱
// ==========================================

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  condition?: string | null;
  description?: string | null;
  status: string;
  is_approved: boolean;
  created_at: string | null;
  approved_at?: string | null;
  image_url?: unknown;
  images?: unknown;
}

// ==========================================
// 商品所有權驗證狀態
// ==========================================

type OwnershipStatus =
  | "idle"
  | "checking"
  | "own"
  | "other"
  | "error";

// ==========================================
// 與刊登表單的 11 種分類保持一致
// ==========================================

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  tools_stationery: "文具/專業工具",
  dorm_supplies: "租屋收納/雜貨",
  hobbies: "遊戲/娛樂",
  cosmetics: "化妝品/美妝",
  food: "食物/零食",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",

  // 舊資料可能使用的分類代碼

  electronic: "電子產品",
  digital: "電子產品",
  book: "書籍教材",
  textbooks: "書籍教材",
  books_textbooks: "書籍教材",
  tools: "文具/專業工具",
  stationery: "文具/專業工具",
  supplies: "文具/專業工具",
  home: "租屋收納/雜貨",
  household: "租屋收納/雜貨",
  home_living: "租屋收納/雜貨",
  games: "遊戲/娛樂",
  entertainment: "遊戲/娛樂",
  beauty: "化妝品/美妝",
  snacks: "食物/零食",
  clothes: "服飾配件",
  fashion: "服飾配件",
  accessories: "服飾配件",
  appliances: "家具家電",
  sport: "運動用品",
  others: "其他",
};

// ==========================================
// 商品新舊程度
// ==========================================

const CONDITION_LABELS: Record<string, string> = {
  new_sealed: "全新未拆封",
  new_opened: "全新已拆封",
  like_new: "近全新（9成新以上）",
  good: "保存良好（7～8成新）",
  fair: "有使用痕跡（5～6成新）",
  used: "明顯使用痕跡（5成新以下）",
};

// ==========================================
// 驗證商品 ID
// ==========================================

function validUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ==========================================
// 商品分類中文名稱
// ==========================================

function getCategoryLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "其他";
  }

  const category = value.trim();

  return (
    CATEGORY_LABELS[category.toLowerCase()] ||
    category
  );
}

// ==========================================
// 商品新舊程度中文名稱
// ==========================================

function getConditionLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "未提供";
  }

  const condition = value.trim();

  return (
    CONDITION_LABELS[condition.toLowerCase()] ||
    condition
  );
}

// ==========================================
// 保留原本商品照片處理方式
// ==========================================

function getImageUrl(value: unknown): string {
  const fallback = "/placeholder-logo.png";

  if (!value) return fallback;

  let raw: unknown = value;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        raw = parsed[0];
      }
    } catch {
      // 一般圖片網址
    }
  }

  if (Array.isArray(raw)) {
    raw = raw[0];
  }

  if (typeof raw !== "string") {
    return fallback;
  }

  const clean = raw.trim();

  if (!clean) return fallback;

  if (
    clean.startsWith("https://") ||
    clean.startsWith("http://")
  ) {
    return clean;
  }

  return (
    "https://arcapfqiihchltdhysea.supabase.co" +
    "/storage/v1/object/public/product-images/" +
    clean.replace(/^\/+/, "")
  );
}

// ==========================================
// 驗證 LINE 加好友連結
// ==========================================

function isValidLineFriendUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

// ==========================================
// 商品日期格式
// ==========================================

function getDateLabel(
  value: string | null | undefined
): string {
  if (!value) {
    return "未提供";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未提供";
  }

  return date.toLocaleDateString("zh-TW");
}

// ==========================================
// 商品詳情頁面
// ==========================================

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const {
    lineUserId,
    userEmail,
    isAuthenticated,
    isLoading: liffLoading,
  } = useLiff();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadedProductId, setLoadedProductId] =
    useState("");

  const [contactLoading, setContactLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // 檢舉視窗開關

  const [reportOpen, setReportOpen] =
    useState(false);

  // 檢舉視窗關閉後重新查詢商品

  const [refreshKey, setRefreshKey] =
    useState(0);

  // 商品所有權驗證

  const [ownershipStatus, setOwnershipStatus] =
    useState<OwnershipStatus>("idle");

  const [loadedOwnershipKey, setLoadedOwnershipKey] =
    useState("");

  const [ownershipRefresh, setOwnershipRefresh] =
    useState(0);

  // 防止重複點擊聯絡賣家

  const contactRequestRef = useRef(false);

  // ========================================
  // 目前登入者身分
  // ========================================

  const identityKey =
    lineUserId &&
    userEmail &&
    isAuthenticated
      ? `${lineUserId}:${userEmail.toLowerCase()}`
      : "";

  const ownershipKey =
    `${identityKey}:${id}:${refreshKey}`;

  const activeRequestKey =
    useRef(ownershipKey);

  useEffect(() => {
    activeRequestKey.current = ownershipKey;

    setReportOpen(false);
  }, [ownershipKey]);

  // ========================================
  // 1. 透過公開 API 取得商品詳情
  //
  // 不需要登入
  // 不需要校園信箱驗證
  // 不直接查詢 Supabase Products
  // ========================================

  useEffect(() => {
    let cancelled = false;

    const controller =
      new AbortController();

    setProduct(null);
    setError("");
    setLoading(true);
    setLoadedProductId("");

    if (!id || !validUUID(id)) {
      setLoadedProductId(id);
      setLoading(false);

      return;
    }

    async function fetchProductDetail() {
      try {
        const response = await fetch(
          `/api/products?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (cancelled) return;

        // 商品不存在、待審核、檢舉或下架

        if (response.status === 404) {
          setProduct(null);
          return;
        }

        const result = await response
          .json()
          .catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(
            result?.error ||
              `商品載入失敗（HTTP ${response.status}）`
          );
        }

        if (
          !result?.success ||
          !result.product
        ) {
          throw new Error(
            "商品資料回傳格式不正確"
          );
        }

        const data =
          result.product as Product;

        // 額外驗證商品 ID 及公開狀態

        if (
          data.id !== id ||
          typeof data.name !== "string"
        ) {
          throw new Error(
            "商品資料驗證失敗"
          );
        }

        if (
          data.status !== "approved" ||
          data.is_approved !== true
        ) {
          setProduct(null);
          return;
        }

        setProduct(data);

      } catch (err) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        console.error(
          "讀取商品失敗:",
          err
        );

        setProduct(null);

        setError(
          err instanceof Error
            ? err.message
            : "商品載入失敗，請稍後再試"
        );

      } finally {
        if (!cancelled) {
          setLoadedProductId(id);
          setLoading(false);
        }
      }
    }

    void fetchProductDetail();

    return () => {
      cancelled = true;
      controller.abort();
    };

  }, [id, refreshKey]);

  // ========================================
  // 2. 透過私人 API 驗證商品所有權
  //
  // 公開 API 不提供賣家 LINE ID
  // 改由後端確認是否為自己的商品
  // ========================================

  useEffect(() => {
    if (
      liffLoading ||
      loading ||
      !product ||
      product.id !== id ||
      !identityKey
    ) {
      setOwnershipStatus("idle");
      setLoadedOwnershipKey("");

      return;
    }

    let cancelled = false;

    setOwnershipStatus("checking");
    setLoadedOwnershipKey("");

    async function checkOwnership() {
      try {
        const result = await contactRequest(
          `/api/my-products?id=${encodeURIComponent(id)}`,
          "GET"
        );

        if (cancelled) return;

        if (
          result?.success &&
          result.product?.id === id
        ) {
          setOwnershipStatus("own");
        } else {
          setOwnershipStatus("error");
        }

      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "";

        // 私人商品 API 回傳 404：
        // 商品不存在或不屬於目前登入者
        //
        // 因公開商品已成功取得，
        // 此處可作為非本人商品的 UI 判斷。
        // 實際操作仍由後端重新驗證。

        if (
          message.includes("HTTP 404") &&
          message.includes(
            "商品不存在或你沒有查看權限"
          )
        ) {
          setOwnershipStatus("other");
        } else {
          setOwnershipStatus("error");

          console.error(
            "商品所有權驗證失敗:",
            err
          );
        }

      } finally {
        if (!cancelled) {
          setLoadedOwnershipKey(
            ownershipKey
          );
        }
      }
    }

    void checkOwnership();

    return () => {
      cancelled = true;
    };

  }, [
    id,
    product,
    loading,
    identityKey,
    liffLoading,
    ownershipKey,
    ownershipRefresh,
  ]);

  // ========================================
  // 3. 目前商品所有權判斷
  // ========================================

  const canContact = Boolean(
    lineUserId &&
    userEmail &&
    isAuthenticated
  );

  const ownershipReady =
    loadedOwnershipKey === ownershipKey;

  const isOwnProduct =
    canContact &&
    ownershipReady &&
    ownershipStatus === "own";

  const ownershipChecking =
    canContact &&
    (
      !ownershipReady ||
      ownershipStatus === "checking"
    );

  const ownershipFailed =
    canContact &&
    ownershipReady &&
    ownershipStatus === "error";

  // ========================================
  // 4. 登入後返回目前商品頁面
  // ========================================

  const redirectToVerification = () => {
    const currentPath =
      window.location.pathname +
      window.location.search;

    try {
      sessionStorage.setItem(
        "login_next",
        currentPath
      );
    } catch {
      // 仍可透過 next 參數返回
    }

    router.push(
      `/?next=${encodeURIComponent(currentPath)}`
    );
  };

  // ========================================
  // 5. 聯絡賣家
  // 保留 LINE 官方帳號通知
  // ========================================

  const handleContact = async () => {
    if (
      !product ||
      product.id !== id ||
      contactLoading ||
      contactRequestRef.current
    ) {
      return;
    }

    if (liffLoading) {
      alert(
        "LINE 登入狀態還在載入，請稍後再試"
      );

      return;
    }

    if (!canContact) {
      redirectToVerification();
      return;
    }

    if (ownershipChecking) {
      toast.info(
        "正在確認商品所有權，請稍後再試"
      );

      return;
    }

    if (ownershipFailed) {
      toast.error(
        "商品身分驗證失敗，請重新驗證"
      );

      return;
    }

    if (isOwnProduct) {
      alert(
        "無法聯絡自己刊登的商品"
      );

      return;
    }

    if (
      !ownershipReady ||
      ownershipStatus !== "other"
    ) {
      return;
    }

    const requestKey = ownershipKey;

    try {
      contactRequestRef.current = true;

      setContactLoading(true);

      // 保留原本 POST API
      // 後端負責驗證賣家及發送 LINE 通知

      const result = await contactRequest(
        "/api/seller-contact",
        "POST",
        {
          productId: product.id,
        }
      );

      // 防止切換帳號或商品後
      // 開啟上一筆請求的賣家連結

      if (
        activeRequestKey.current !== requestKey
      ) {
        return;
      }

      const friendUrl =
        result?.lineFriendUrl;

      if (
        typeof friendUrl !== "string" ||
        !friendUrl
      ) {
        alert(
          "賣家尚未設定 LINE 加好友連結"
        );

        return;
      }

      if (!isValidLineFriendUrl(friendUrl)) {
        alert(
          "賣家的 LINE 連結格式不正確"
        );

        return;
      }

      window.location.assign(friendUrl);

    } catch (err) {
      if (
        activeRequestKey.current !== requestKey
      ) {
        return;
      }

      console.error(
        "聯絡賣家失敗:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "無法取得賣家的 LINE 聯絡方式";

      alert(
        `聯絡賣家失敗：${message}`
      );

      toast.error(message);

    } finally {
      contactRequestRef.current = false;

      setContactLoading(false);
    }
  };

  // ========================================
  // 6. 開啟商品檢舉視窗
  // ========================================

  const handleReport = () => {
    if (
      !product ||
      product.id !== id
    ) {
      return;
    }

    if (liffLoading) {
      toast.info(
        "登入狀態載入中，請稍後再試"
      );

      return;
    }

    if (!canContact) {
      toast.info(
        "請先完成 LINE 與學校信箱驗證"
      );

      redirectToVerification();

      return;
    }

    if (ownershipChecking) {
      toast.info(
        "正在確認商品所有權，請稍後再試"
      );

      return;
    }

    if (ownershipFailed) {
      toast.error(
        "商品身分驗證失敗，請重新驗證"
      );

      return;
    }

    if (isOwnProduct) {
      toast.error(
        "不能檢舉自己刊登的商品"
      );

      return;
    }

    if (
      !ownershipReady ||
      ownershipStatus !== "other"
    ) {
      return;
    }

    setReportOpen(true);
  };

  // ========================================
  // 7. 商品載入中
  // 保留原本 UI
  // ========================================

  if (
    loading ||
    loadedProductId !== id
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-3">

        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />

        <p className="text-sm text-slate-500">
          正在載入商品...
        </p>

      </div>
    );
  }

  // ========================================
  // 8. 商品讀取錯誤
  // ========================================

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 px-6">

        <AlertCircle className="h-10 w-10 text-red-500" />

        <p className="text-slate-600 text-center break-words">
          {error}
        </p>

        <Button
          type="button"
          onClick={() => {
            setLoading(true);

            setRefreshKey(
              (current) => current + 1
            );
          }}
          className="bg-[#D35400] hover:bg-[#A04000] text-white"
        >
          重新讀取商品
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push("/products")}
        >
          返回市集
        </Button>

      </div>
    );
  }

  // ========================================
  // 9. 找不到商品或商品已下架
  // ========================================

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4">

        <p className="text-slate-500">
          找不到商品，或商品已暫時隱藏或下架
        </p>

        <Button
          onClick={() => router.push("/products")}
        >
          返回市集
        </Button>

      </div>
    );
  }

  const categoryName =
    getCategoryLabel(product.category);

  const conditionName =
    getConditionLabel(product.condition);

  // ========================================
  // 10. 保留原本商品詳情 UI
  // ========================================

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-10">

      {/* 頂部導覽 */}

      <div className="sticky top-0 z-20 bg-white px-4 py-3 flex items-center gap-1 border-b shadow-sm">

        <Navigation />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full h-9 w-9"
        >

          <ChevronLeft className="h-5 w-5 text-slate-600" />

        </Button>

        <h1 className="font-bold text-slate-800 text-sm ml-1">
          商品詳情
        </h1>

      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* 商品圖片 */}

        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-orange-50">

          <img
            src={getImageUrl(
              product.image_url ||
              product.images
            )}
            alt={product.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const fallback =
                "/placeholder-logo.png";

              if (
                !e.currentTarget.src.endsWith(
                  fallback
                )
              ) {
                e.currentTarget.src =
                  fallback;
              }
            }}
          />

          {/* 收藏愛心 */}

          <div className="absolute top-3 right-3 z-10">

            <FavoriteButton
              productId={product.id}
            />

          </div>

        </div>

        {/* 商品名稱及價格 */}

        <div className="space-y-2">

          <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold text-[#D35400]">

            {categoryName}

          </span>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">

            {product.name}

          </h2>

          <p className="text-3xl font-black text-[#D35400]">

            NT${" "}
            {Number(product.price).toLocaleString(
              "zh-TW"
            )}

          </p>

        </div>

        {/* 商品新舊程度 */}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50/50">

          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3 tracking-wider">

            <PackageCheck className="h-4 w-4" />

            商品新舊程度

          </h3>

          <div className="flex items-center justify-between gap-3">

            <span className="text-sm text-slate-500">

              商品狀況

            </span>

            <span className="inline-flex items-center rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-[#D35400]">

              {conditionName}

            </span>

          </div>

        </div>

        {/* 商品描述 */}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50/50">

          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3 tracking-wider">

            <Tag className="h-3.5 w-3.5" />

            商品描述

          </h3>

          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">

            {product.description ||
              "賣家尚未填寫商品描述"}

          </p>

          {/* 上架日期 */}

          <div className="pt-4 mt-4 border-t border-dashed flex items-center text-[10px] text-slate-400">

            <Calendar className="h-3 w-3 mr-1.5" />

            上架日期：
            {getDateLabel(
              product.created_at
            )}

          </div>

        </div>

        {/* ==================================
            聯絡賣家
        ================================== */}

        {isOwnProduct ? (

          /* 自己刊登的商品 */

          <div className="rounded-2xl bg-orange-50 p-5 text-center text-sm font-bold text-[#D35400]">

            這是你自己刊登的商品

          </div>

        ) : ownershipFailed ? (

          /* 商品所有權驗證失敗 */

          <div className="rounded-2xl bg-orange-50 p-5 space-y-3 text-center">

            <AlertCircle className="h-6 w-6 text-[#D35400] mx-auto" />

            <p className="text-sm font-bold text-[#D35400]">

              商品身分驗證失敗

            </p>

            <p className="text-xs text-slate-500">

              請重新驗證後再聯絡賣家或檢舉商品。

            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOwnershipStatus(
                  "checking"
                );

                setOwnershipRefresh(
                  (current) => current + 1
                );
              }}
              className="rounded-xl text-[#D35400] border-orange-200"
            >

              重新驗證

            </Button>

          </div>

        ) : (

          /* 原本聯絡賣家按鈕 */

          <Button
            type="button"
            onClick={() => {
              void handleContact();
            }}
            disabled={
              contactLoading ||
              ownershipChecking ||
              liffLoading
            }
            className="w-full h-auto min-h-20 bg-[#D35400] hover:bg-[#A04000] text-white py-5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
          >

            {contactLoading ? (

              <>

                <Loader2 className="animate-spin h-6 w-6" />

                <span className="text-base">

                  正在聯絡賣家...

                </span>

              </>

            ) : ownershipChecking ||
              liffLoading ? (

              <>

                <Loader2 className="animate-spin h-6 w-6" />

                <span className="text-base">

                  正在確認身分...

                </span>

              </>

            ) : (

              <>

                <span className="flex items-center text-lg">

                  <MessageCircle className="mr-2 h-6 w-6" />

                  聯絡賣家

                </span>

                <span className="text-xs opacity-90 font-medium">

                  {canContact
                    ? "開啟賣家的 LINE 加好友連結"
                    : "完成 LINE 與學校信箱驗證後即可聯絡"}

                </span>

              </>

            )}

          </Button>

        )}

        {/* ==================================
            檢舉商品按鈕
        ================================== */}

        {!isOwnProduct && (

          <Button
            type="button"
            variant="outline"
            onClick={handleReport}
            disabled={
              ownershipChecking ||
              ownershipFailed ||
              liffLoading
            }
            className="w-full h-12 rounded-2xl border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-2 font-bold"
          >

            <Flag className="h-4 w-4" />

            檢舉商品

          </Button>

        )}

        {/* 交易安全提醒 */}

        <p className="text-center text-xs text-slate-400 leading-relaxed">

          交易前請確認商品狀況及面交資訊，
          避免提供不必要的個人資料。

        </p>

      </div>

      {/* ==================================
          保留原本商品檢舉視窗
      ================================== */}

      <ReportProductDialog
        key={`${product.id}:${identityKey}`}
        productId={product.id}
        productName={product.name}
        open={
          reportOpen &&
          canContact &&
          ownershipReady &&
          ownershipStatus === "other" &&
          !liffLoading
        }
        onClose={() => {
          setReportOpen(false);

          setRefreshKey(
            (current) => current + 1
          );
        }}
      />

    </main>
  );
}
