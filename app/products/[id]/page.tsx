
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { contactRequest } from "@/lib/contact-client";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { useLiff } from "@/components/liff-provider";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  Calendar,
  Tag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  status: string;
  created_at: string;
  image_url?: unknown;
  images?: unknown;
  line_user_id?: string | null;
  lineUserId?: string | null;
}

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
      // 原本就是一般圖片網址
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

function isValidLineFriendUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    if (
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length
    ) {
      return true;
    }

    if (url.hostname === "lin.ee" && url.pathname.length > 1) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const {
    lineUserId,
    isAuthenticated,
    isLoading: liffLoading,
  } = useLiff();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [error, setError] = useState("");

  // 讀取商品資料：不需要 LINE 登入
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProductDetail() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("status", "approved")
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        console.error("讀取商品失敗:", err);

        if (!cancelled) {
          setError("商品載入失敗，請稍後再試");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProductDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 聯絡賣家
  const handleContact = async () => {
    if (!product || contactLoading) return;

    // 等待登入狀態初始化
    if (liffLoading) {
      toast.info("正在確認登入狀態，請稍候");
      return;
    }

    // LINE 或學校信箱尚未完成驗證
    if (!lineUserId || !isAuthenticated) {
      const currentPath =
        window.location.pathname +
        window.location.search;

      router.push(
        `/?next=${encodeURIComponent(currentPath)}`
      );

      return;
    }

    // 從商品取得賣家 LINE User ID
    const sellerId =
      product.line_user_id || product.lineUserId;

    if (!sellerId) {
      toast.error("此商品缺少賣家識別資料");
      return;
    }

    try {
      setContactLoading(true);

      // 透過已驗證身分的後端 API
      // 取得賣家自行設定的 LINE 加好友連結
      const result = await contactRequest(
  `/api/seller-contact?productId=${encodeURIComponent(
    product.id
  )}`
);

      const friendUrl = result.lineFriendUrl;

      if (!friendUrl) {
        toast.error(
          "賣家尚未設定 LINE 加好友連結，暫時無法聯絡"
        );
        return;
      }

      if (
        typeof friendUrl !== "string" ||
        !isValidLineFriendUrl(friendUrl)
      ) {
        toast.error("賣家的 LINE 連結格式不正確");
        return;
      }

      // 在目前頁面開啟 LINE，
      // 避免非同步請求後新視窗遭瀏覽器阻擋
      window.location.assign(friendUrl);
    } catch (err) {
      console.error("取得賣家聯絡方式失敗:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "無法取得賣家的 LINE 聯絡方式"
      );
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D35400]" />
        <p className="text-sm text-slate-500">
          正在載入商品...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4 px-6">
        <AlertCircle className="h-10 w-10 text-red-500" />
        <p className="text-slate-600">{error}</p>

        <Button onClick={() => router.push("/products")}>
          返回市集
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">
          找不到商品，或商品尚未通過審核
        </p>

        <Button onClick={() => router.push("/products")}>
          返回市集
        </Button>
      </div>
    );
  }

  const canContact = Boolean(
    lineUserId && isAuthenticated
  );

  const isOwnProduct =
    Boolean(lineUserId) &&
    lineUserId ===
      (product.line_user_id || product.lineUserId);

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
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-white shadow-sm border border-orange-50">
          <img
            src={getImageUrl(
              product.image_url || product.images
            )}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const fallback = "/placeholder-logo.png";

              if (!e.currentTarget.src.endsWith(fallback)) {
                e.currentTarget.src = fallback;
              }
            }}
          />
        </div>

        {/* 商品名稱及價格 */}
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold text-[#D35400]">
            {product.category || "一般商品"}
          </span>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {product.name}
          </h2>

          <p className="text-3xl font-black text-[#D35400]">
            NT$ {Number(product.price).toLocaleString("zh-TW")}
          </p>
        </div>

        {/* 商品描述 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50/50">
          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3 tracking-wider">
            <Tag className="h-3.5 w-3.5" />
            商品描述
          </h3>

          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {product.description || "賣家尚未填寫商品描述"}
          </p>

          <div className="pt-4 mt-4 border-t border-dashed flex items-center text-[10px] text-slate-400">
            <Calendar className="h-3 w-3 mr-1.5" />
            上架日期：
            {new Date(product.created_at).toLocaleDateString(
              "zh-TW"
            )}
          </div>
        </div>

        {/* 聯絡賣家 */}
        {isOwnProduct ? (
          <div className="rounded-2xl bg-orange-50 p-5 text-center text-sm font-bold text-[#D35400]">
            這是你自己刊登的商品
          </div>
        ) : (
          <Button
            type="button"
            onClick={handleContact}
            disabled={contactLoading || liffLoading}
            className="w-full h-auto min-h-20 bg-[#D35400] hover:bg-[#A04000] text-white py-5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
          >
            {contactLoading ? (
              <>
                <Loader2 className="animate-spin h-6 w-6" />
                <span className="text-base">
                  正在取得賣家聯絡方式...
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

        <p className="text-center text-xs text-slate-400 leading-relaxed">
          交易前請確認商品狀況及面交資訊，
          避免提供不必要的個人資料。
        </p>
      </div>
    </main>
  );
}
