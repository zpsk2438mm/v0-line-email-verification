
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { contactRequest } from "@/lib/contact-client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Loader2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProductInitialData {
  id?: string;
  name?: string;
  title?: string;
  category?: string;
  price?: number | string;
  contact?: string;
  description?: string;
  image_url?: string | null;
  images?: string[];
}

interface ListingFormProps {
  initialData?: ProductInitialData;
  isEditing?: boolean;
}

// 與市集首頁一致的分類 ID
const CATEGORIES = [
  { id: "electronics", label: "📱 電子產品" },
  { id: "books", label: "📚 書籍教材" },
  { id: "tools_stationery", label: "✏️ 文具/專業工具" },
  { id: "dorm_supplies", label: "🏠 租屋收納/雜貨" },
  { id: "hobbies", label: "🎮 遊戲/娛樂" },
  { id: "cosmetics", label: "💄 化妝品/美妝" },
  { id: "food", label: "🍕 食物/零食" },
  { id: "clothing", label: "👕 服飾配件" },
  { id: "furniture", label: "🛋️ 家具家電" },
  { id: "sports", label: "🏀 運動用品" },
  { id: "other", label: "🔍 其他" },
];

function validLineUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function formatDatabaseError(error: {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}) {
  return [
    `資料庫錯誤：${error.message}`,
    error.code ? `錯誤代碼：${error.code}` : "",
    error.details ? `詳細資訊：${error.details}` : "",
    error.hint ? `建議：${error.hint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ListingForm({
  initialData,
  isEditing = false,
}: ListingFormProps) {
  const router = useRouter();

  const {
    lineUserId,
    userEmail,
    isAuthenticated,
    isLoading: isLiffLoading,
  } = useLiff();

  const { toast } = useToast();

  const [title, setTitle] = useState(
    initialData?.name || initialData?.title || ""
  );

  const [category, setCategory] = useState(
    initialData?.category || ""
  );

  const [price, setPrice] = useState(
    initialData?.price?.toString() || ""
  );

  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  // 現有 products 資料表只有 image_url
  const [imageUrl, setImageUrl] = useState(
    initialData?.image_url ||
      initialData?.images?.[0] ||
      ""
  );

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  // 上傳單張商品圖片
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "檔案格式錯誤",
        description: "請選擇圖片檔案。",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "圖片太大",
        description: "請上傳小於 10MB 的圖片。",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setSubmitError("");

    try {
      const fileExt =
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName =
        `${Date.now()}_` +
        `${Math.random().toString(36).slice(2)}.` +
        fileExt;

      const filePath = `products/${fileName}`;

      // 優先使用原本的 product-images bucket
      const { error: uploadError } =
        await supabase.storage
          .from("product-images")
          .upload(filePath, file);

      let uploadedBucket = "product-images";

      if (uploadError) {
        // 保留原本的備用 bucket
        const { error: fallbackError } =
          await supabase.storage
            .from("products")
            .upload(filePath, file);

        if (fallbackError) {
          throw new Error(
            `圖片上傳失敗：${uploadError.message}；` +
              `備用空間：${fallbackError.message}`
          );
        }

        uploadedBucket = "products";
      }

      const { data: publicUrlData } =
        supabase.storage
          .from(uploadedBucket)
          .getPublicUrl(filePath);

      setImageUrl(publicUrlData.publicUrl);

      toast({
        title: "圖片上傳成功",
        description: "商品照片已準備完成。",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "圖片上傳失敗，請稍後再試。";

      setSubmitError(msg);

      toast({
        title: "圖片上傳失敗",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
  };

  // 送出商品
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isSubmitting || uploadingImage) return;

    setSubmitError("");

    if (!lineUserId) {
      setSubmitError(
        "無法取得 LINE 身分，請重新登入。"
      );
      return;
    }

    if (
      !isAuthenticated ||
      !userEmail?.toLowerCase().endsWith("@stust.edu.tw")
    ) {
      setSubmitError(
        "請先完成南臺學校信箱驗證。"
      );
      return;
    }

    if (
      !title.trim() ||
      !category ||
      price.trim() === ""
    ) {
      setSubmitError(
        "請填寫商品名稱、分類及價格。"
      );
      return;
    }

    const categoryExists = CATEGORIES.some(
      (item) => item.id === category
    );

    if (!categoryExists) {
      setSubmitError("請重新選擇商品分類。");
      return;
    }

    const numericPrice = Number(price);

    if (
      !Number.isSafeInteger(numericPrice) ||
      numericPrice < 0
    ) {
      setSubmitError(
        "請輸入有效的整數商品價格。"
      );
      return;
    }

    if (!imageUrl) {
      setSubmitError(
        "請先上傳商品照片。"
      );
      return;
    }

    if (isEditing && !initialData?.id) {
      setSubmitError(
        "找不到要編輯的商品 ID。"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 每次刊登前確認賣家私人 LINE 連結
      const contactData = await contactRequest(
        "/api/seller-contact"
      );

      const sellerLineUrl =
        typeof contactData?.lineFriendUrl === "string"
          ? contactData.lineFriendUrl.trim()
          : "";

      if (!validLineUrl(sellerLineUrl)) {
        throw new Error(
          "尚未設定有效的私人 LINE 加好友連結，" +
            "請先前往個人中心設定。"
        );
      }

      // 與現有 Supabase products 資料表一致
      const payload = {
        name: title.trim(),
        category,
        price: numericPrice,
        description: description.trim(),
        contact: sellerLineUrl,
        image_url: imageUrl,
        line_user_id: lineUserId,
        verified_email: userEmail,
        status: "pending",
        is_approved: false,
      };

      console.log("準備儲存商品:", {
        name: payload.name,
        category: payload.category,
        price: payload.price,
        hasImage: Boolean(payload.image_url),
        isEditing,
      });

      let savedProductId: string | undefined;

      if (isEditing && initialData?.id) {
        // 編輯時只更新自己的商品
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", initialData.id)
          .eq("line_user_id", lineUserId)
          .select("id")
          .single();

        if (error) {
          console.error("商品更新失敗:", error);
          throw new Error(formatDatabaseError(error));
        }

        savedProductId = data.id;
      } else {
        // 新增商品使用 insert，避免誤更新既有商品
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          console.error("商品新增失敗:", error);
          throw new Error(formatDatabaseError(error));
        }

        savedProductId = data.id;
      }

      // 保留原本的通知 API 呼叫
      // 通知失敗不影響商品刊登
      try {
        const response = await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: isEditing
              ? "product_updated"
              : "product_created",
            productId: savedProductId,
            title: payload.name,
            sellerLineId: lineUserId,
          }),
        });

        if (!response.ok) {
          console.warn(
            "通知 API 回傳錯誤:",
            response.status
          );
        }
      } catch (notifyErr) {
        console.warn(
          "通知發送失敗，不影響商品儲存:",
          notifyErr
        );
      }

      toast({
        title: isEditing ? "更新成功" : "刊登成功",
        description:
          "商品已送出審核，審核通過後將公開於市集！",
      });

      router.push("/my-listings");
      router.refresh();
    } catch (err: unknown) {
      console.error("商品刊登失敗:", err);

      const msg =
        err instanceof Error
          ? err.message
          : "發生未知錯誤，請稍後再試。";

      setSubmitError(msg);

      toast({
        title: "儲存失敗",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLiffLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D95300]" />
        <p className="text-sm text-muted-foreground">
          正在驗證 LINE 身分與環境...
        </p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          {isEditing
            ? "編輯二手物品"
            : "刊登二手物品"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* 商品照片 */}
          <div className="space-y-2">
            <Label>
              商品照片（1 張）*
            </Label>

            {imageUrl ? (
              <div className="relative w-40 h-40 rounded-xl overflow-hidden border">
                <img
                  src={imageUrl}
                  alt="商品照片"
                  className="w-full h-full object-cover"
                />

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white"
                  aria-label="移除商品照片"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-40 w-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-[#D95300]">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#D95300]" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      新增照片
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 商品名稱 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              商品名稱 *
            </Label>

            <Input
              id="title"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="例：大一英文課本"
              required
            />
          </div>

          {/* 手機原生分類選單 */}
          <div className="space-y-2">
            <Label htmlFor="category">
              分類 *
            </Label>

            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              required
              className="flex h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D95300]"
            >
              <option value="" disabled>
                請選擇分類
              </option>

              {CATEGORIES.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* 價格 */}
          <div className="space-y-2">
            <Label htmlFor="price">
              預售價格 (NT$) *
            </Label>

            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="請輸入金額"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              required
              className="h-12 rounded-xl"
            />
          </div>

          {/* LINE 聯絡方式 */}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-800">
                LINE 聯絡方式自動帶入
              </p>

              <p className="text-xs leading-relaxed text-emerald-700">
                系統會使用你在個人中心設定的私人
                LINE 加好友連結，刊登時不需要重複輸入。
              </p>
            </div>
          </div>

          {/* 商品詳情 */}
          <div className="space-y-2">
            <Label htmlFor="description">
              商品詳情
            </Label>

            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="說明物品新舊程度、面交地點等"
              className="rounded-xl"
            />
          </div>

          {/* 資料庫錯誤訊息 */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="whitespace-pre-wrap break-words">
                {submitError}
              </p>
            </div>
          )}

          {/* 送出審核 */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white font-bold text-base"
            disabled={
              isSubmitting || uploadingImage
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                資料處理中...
              </>
            ) : uploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在上傳照片...
              </>
            ) : isEditing ? (
              "確認修改並送出審核"
            ) : (
              "確認刊登並送出審核"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
