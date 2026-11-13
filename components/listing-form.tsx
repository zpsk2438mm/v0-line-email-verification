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
  title?: string;
  category?: string;
  price?: number | string;
  contact_info?: string;
  description?: string;
  images?: string[];
}

interface ListingFormProps {
  initialData?: ProductInitialData;
  isEditing?: boolean;
}

const CATEGORIES = [
  "書籍教材",
  "電子產品",
  "生活用品",
  "美妝穿搭",
  "其他",
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

export default function ListingForm({
  initialData,
  isEditing = false,
}: ListingFormProps) {
  const router = useRouter();

  const {
    lineUserId: lineId,
    userProfile,
    isLoading: isLiffLoading,
  } = useLiff();

  const displayName =
    userProfile?.displayName || null;

  const { toast } = useToast();

  const [title, setTitle] = useState(
    initialData?.title || ""
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

  const [images, setImages] = useState<string[]>(
    initialData?.images || []
  );

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  // 上傳圖片至 Supabase Storage
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast({
        title: "圖片數量限制",
        description: "最多只能上傳 5 張商品照片！",
        variant: "destructive",
      });

      e.target.value = "";
      return;
    }

    setUploadingImage(true);

    const newUploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const fileExt =
          file.name.split(".").pop() || "jpg";

        const fileName =
          `${Date.now()}_${i}_` +
          `${Math.random().toString(36).substring(7)}.${fileExt}`;

        const filePath = `products/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(filePath, file);

        if (uploadError) {
          // 保留原本相容的備用 bucket
          const { error: fallbackError } =
            await supabase.storage
              .from("products")
              .upload(filePath, file);

          if (fallbackError) {
            throw uploadError;
          }

          const { data: publicUrlData } =
            supabase.storage
              .from("products")
              .getPublicUrl(filePath);

          newUploadedUrls.push(
            publicUrlData.publicUrl
          );
        } else {
          const { data: publicUrlData } =
            supabase.storage
              .from("product-images")
              .getPublicUrl(filePath);

          newUploadedUrls.push(
            publicUrlData.publicUrl
          );
        }
      }

      setImages((prev) => [
        ...prev,
        ...newUploadedUrls,
      ]);

      toast({
        title: "上傳成功",
        description:
          `成功上傳 ${newUploadedUrls.length} 張圖片`,
      });
    } catch (err: unknown) {
      console.error("圖片上傳失敗:", err);

      toast({
        title: "圖片上傳失敗",
        description:
          err instanceof Error
            ? err.message
            : "請確認 Supabase Storage 權限設定",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // 移除照片
  const handleRemoveImage = (
    indexToRemove: number
  ) => {
    setImages((prev) =>
      prev.filter(
        (_, index) => index !== indexToRemove
      )
    );
  };

  // 刊登或修改商品
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isSubmitting || uploadingImage) {
      return;
    }

    setSubmitError("");

    // 取得 LINE ID
    const activeLineId =
      lineId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("line_user_id")
        : null);

    if (!activeLineId) {
      const msg =
        "無法取得 LINE 身分，請重新登入。";

      setSubmitError(msg);

      toast({
        title: "無法讀取 LINE ID",
        description: msg,
        variant: "destructive",
      });

      return;
    }

    // 檢查商品資料
    if (
      !title.trim() ||
      !category ||
      price.trim() === ""
    ) {
      const msg =
        "請填寫商品名稱、分類及價格。";

      setSubmitError(msg);

      toast({
        title: "未填寫完整",
        description: msg,
        variant: "destructive",
      });

      return;
    }

    if (!CATEGORIES.includes(category)) {
      const msg = "請重新選擇商品分類。";

      setSubmitError(msg);

      toast({
        title: "分類錯誤",
        description: msg,
        variant: "destructive",
      });

      return;
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      const msg =
        "請輸入有效的商品價格。";

      setSubmitError(msg);

      toast({
        title: "價格錯誤",
        description: msg,
        variant: "destructive",
      });

      return;
    }

    if (images.length === 0) {
      const msg =
        "請至少上傳 1 張商品照片。";

      setSubmitError(msg);

      toast({
        title: "未提供商品照片",
        description: msg,
        variant: "destructive",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      // 每次送出時，重新向伺服器確認
      // 賣家是否已設定私人 LINE 加好友連結
      const contactData = await contactRequest(
        "/api/seller-contact"
      );

      const sellerLineUrl =
        typeof contactData?.lineFriendUrl === "string"
          ? contactData.lineFriendUrl.trim()
          : "";

      if (!validLineUrl(sellerLineUrl)) {
        throw new Error(
          "尚未設定有效的私人 LINE 加好友連結，請先前往個人中心設定後再刊登。"
        );
      }

      // 保留 products 原本的資料欄位
      // contact_info 自動填入已驗證的 LINE 連結
      const payload = {
        title: title.trim(),
        category,
        price: numericPrice,
        contact_info: sellerLineUrl,
        description: description.trim(),
        images,
        line_user_id: activeLineId,
        seller_name:
          displayName || "校園賣家",
        status: "pending",
        updated_at: new Date().toISOString(),
        ...(isEditing && initialData?.id
          ? { id: initialData.id }
          : {}),
      };

      // 保留原本的 Supabase 商品儲存流程
      const { data, error } = await supabase
        .from("products")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 保留原本的管理員通知
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: isEditing
              ? "product_updated"
              : "product_created",
            productId:
              data?.id || initialData?.id,
            title: payload.title,
            sellerLineId: activeLineId,
          }),
        });
      } catch (notifyErr) {
        console.warn(
          "管理員通知發送失敗，不影響商品儲存:",
          notifyErr
        );
      }

      toast({
        title: isEditing
          ? "更新成功"
          : "刊登成功",
        description:
          "商品已送出審核，管理員審核通過後將公開於市集！",
      });

      router.push("/my-listings");
    } catch (err: unknown) {
      console.error("儲存失敗:", err);

      const msg =
        err instanceof Error
          ? err.message
          : "無法寫入資料庫，請稍後再試。";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />

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
              商品照片 ({images.length}/5) *
            </Label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative aspect-square rounded-md overflow-hidden border group"
                >
                  <img
                    src={url}
                    alt={`商品圖 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveImage(idx)
                    }
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition"
                    aria-label={`移除第 ${idx + 1} 張照片`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary transition bg-gray-50/50">
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />

                      <span className="text-xs text-muted-foreground">
                        新增照片
                      </span>
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 商品名稱 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              商品名稱 *
            </Label>

            <Input
              id="title"
              placeholder="例：大一英文課本 / 羅技無線滑鼠"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              required
            />
          </div>

          {/* 分類 */}
          <div className="space-y-2">
            <Label htmlFor="category">
              分類 *
            </Label>

            {/* 使用手機原生下拉選單，避免選項重疊 */}
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              required
              className="flex h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D95300] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                請選擇分類
              </option>

              {CATEGORIES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
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

          {/* LINE 聯絡方式已於刊登前設定 */}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-800">
                LINE 聯絡方式自動帶入
              </p>

              <p className="text-xs leading-relaxed text-emerald-700">
                系統會使用你在個人中心設定的私人
                LINE 加好友連結，不需要重複輸入
                LINE ID 或手機號碼。
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
              placeholder="說明物品新舊程度、面交地點（如：南臺修齊大樓）等"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              className="rounded-xl"
            />
          </div>

          {/* 錯誤訊息直接顯示在按鈕上方 */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="break-words">
                {submitError}
              </p>
            </div>
          )}

          {/* 刊登按鈕 */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white font-bold text-base"
            disabled={
              isSubmitting ||
              uploadingImage
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
