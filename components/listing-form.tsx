
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
  Sparkles,
} from "lucide-react";

interface ProductInitialData {
  id?: string;
  name?: string;
  title?: string;
  category?: string;
  condition?: string | null;
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

// 保留原本 11 種商品分類
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

// 商品新舊程度
const CONDITIONS = [
  { id: "new_sealed", label: "全新未拆封" },
  { id: "new_opened", label: "全新已拆封" },
  { id: "like_new", label: "近全新（9成新以上）" },
  { id: "good", label: "保存良好（7～8成新）" },
  { id: "fair", label: "有使用痕跡（5～6成新）" },
  { id: "used", label: "明顯使用痕跡（5成新以下）" },
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

// AI 專用圖片壓縮
// 不影響原本上傳至 Supabase 的商品照片
async function compressImageForAI(
  blob: Blob
): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = new window.Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();

      img.onerror = () =>
        reject(
          new Error(
            "無法讀取圖片，請使用 JPG 或 PNG 照片。"
          )
        );

      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");

    const scale = Math.min(
      1,
      1600 / Math.max(img.width, img.height)
    );

    canvas.width = Math.max(
      1,
      Math.round(img.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(img.height * scale)
    );

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("無法處理商品照片。");
    }

    ctx.fillStyle = "#FFFFFF";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

    let quality = 0.85;

    let result = canvas.toDataURL(
      "image/jpeg",
      quality
    );

    // 控制 Base64 大小，保留 API 請求空間
    const maxLength = 1900000;

    while (
      result.length > maxLength &&
      quality > 0.25
    ) {
      quality -= 0.1;

      result = canvas.toDataURL(
        "image/jpeg",
        quality
      );
    }

    if (
      result.length > maxLength ||
      !result.startsWith("data:image/jpeg;base64,")
    ) {
      throw new Error(
        "圖片壓縮失敗，請更換較小的商品照片。"
      );
    }

    return result.split(",")[1];
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

  const [condition, setCondition] = useState(
    initialData?.condition || ""
  );

  const [price, setPrice] = useState(
    initialData?.price?.toString() || ""
  );

  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  // 保留原本單張圖片欄位
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

  // AI 智慧上架狀態
  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiError, setAiError] =
    useState("");

  const [aiSuccess, setAiSuccess] =
    useState("");

  // 保存使用者選擇的原始圖片
  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);

  // AI 智慧商品辨識
  const handleAIRecognition = async () => {
    if (
      aiLoading ||
      uploadingImage ||
      isSubmitting
    ) {
      return;
    }

    setAiError("");
    setAiSuccess("");

    if (!imageUrl) {
      setAiError("請先上傳商品照片。");
      return;
    }

    if (
      !lineUserId ||
      !isAuthenticated ||
      !userEmail
        ?.toLowerCase()
        .endsWith("@stust.edu.tw")
    ) {
      setAiError(
        "請先完成 LINE 登入及學校信箱驗證。"
      );
      return;
    }

    const confirmed = window.confirm(
      "商品照片將傳送至 Google Gemini 進行 AI 辨識。" +
        "\n請確認照片不包含個人資料。" +
        "\n辨識結果可能覆蓋目前的商品名稱、分類及商品詳情。" +
        "\n是否繼續？"
    );

    if (!confirmed) return;

    setAiLoading(true);

    try {
      let imageBlob: Blob;

      // 優先使用使用者原始圖片
      // 避免重複下載 Supabase 圖片
      if (selectedImageFile) {
        imageBlob = selectedImageFile;
      } else {
        const response = await fetch(imageUrl, {
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(
            "無法讀取商品照片，請重新上傳。"
          );
        }

        imageBlob = await response.blob();
      }

      const compressedImage =
        await compressImageForAI(imageBlob);

      // 呼叫後端 AI 辨識 API
      const result = await contactRequest(
        "/api/ai-listing",
        "POST",
        {
          image: compressedImage,
          mimeType: "image/jpeg",
        }
      );

      if (!result?.success || !result?.data) {
        throw new Error(
          result?.error || "AI 商品辨識失敗。"
        );
      }

      const data = result.data;

      let filledFields = 0;

      // 自動填入商品名稱
      if (
        typeof data.name === "string" &&
        data.name.trim()
      ) {
        setTitle(data.name.trim());
        filledFields++;
      }

      // 自動填入商品分類
      if (
        typeof data.category === "string" &&
        CATEGORIES.some(
          (item) => item.id === data.category
        )
      ) {
        setCategory(data.category);
        filledFields++;
      }

      // 自動產生商品詳情
      let aiDescription =
        typeof data.description === "string"
          ? data.description.trim()
          : "";

      // 書籍 ISBN 辨識
      if (
        data.isBook === true &&
        typeof data.isbn === "string" &&
        data.isbn.trim()
      ) {
        const isbn = data.isbn.trim();

        if (!aiDescription.includes(isbn)) {
          aiDescription = [
            aiDescription,
            `ISBN：${isbn}`,
          ]
            .filter(Boolean)
            .join("\n\n");
        }
      }

      if (aiDescription) {
        setDescription(aiDescription);
        filledFields++;
      }

      if (filledFields === 0) {
        throw new Error(
          "AI 未能辨識出有效的商品資訊，請更換清楚的商品照片。"
        );
      }

      setAiSuccess(
        `AI 辨識完成！已填入 ${filledFields} 項商品資訊，請確認內容是否正確。`
      );

      toast({
        title: "AI 智慧辨識成功",
        description:
          "已自動填入商品資訊，請確認後再送出審核。",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "AI 辨識失敗，請稍後再試。";

      setAiError(message);

      toast({
        title: "AI 辨識失敗",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  // 上傳單張商品圖片
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      aiLoading ||
      isSubmitting ||
      uploadingImage
    ) {
      return;
    }

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
    setAiError("");
    setAiSuccess("");

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
        // 保留原本備用 bucket
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

      // 保存原始圖片供 AI 辨識使用
      setSelectedImageFile(file);

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

  // 移除商品照片
  const handleRemoveImage = () => {
    if (
      aiLoading ||
      isSubmitting ||
      uploadingImage
    ) {
      return;
    }

    setImageUrl("");
    setSelectedImageFile(null);
    setAiError("");
    setAiSuccess("");
  };

  // 送出商品
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      isSubmitting ||
      uploadingImage ||
      aiLoading
    ) {
      return;
    }

    setSubmitError("");

    if (!lineUserId) {
      setSubmitError(
        "無法取得 LINE 身分，請重新登入。"
      );
      return;
    }

    if (
      !isAuthenticated ||
      !userEmail
        ?.toLowerCase()
        .endsWith("@stust.edu.tw")
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

    // 檢查商品新舊程度
    const conditionExists = CONDITIONS.some(
      (item) => item.id === condition
    );

    if (!conditionExists) {
      setSubmitError("請選擇商品新舊程度。");
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

      // 保留原本資料庫欄位及審核流程
      const payload = {
        name: title.trim(),
        category,
        condition,
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
        condition: payload.condition,
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

          throw new Error(
            formatDatabaseError(error)
          );
        }

        savedProductId = data.id;
      } else {
        // 新增商品使用 insert
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          console.error("商品新增失敗:", error);

          throw new Error(
            formatDatabaseError(error)
          );
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
        title: isEditing
          ? "更新成功"
          : "刊登成功",
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
                  disabled={
                    aiLoading ||
                    isSubmitting ||
                    uploadingImage
                  }
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white disabled:opacity-50"
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
                  disabled={
                    uploadingImage ||
                    aiLoading ||
                    isSubmitting
                  }
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* AI 智慧上架 */}
          {!isEditing && (
            <div className="space-y-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-purple-800">
                      AI 智慧上架
                    </h3>

                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                      AI
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-purple-600">
                    上傳商品照片，讓 AI 幫你快速填寫商品資訊。
                  </p>
                </div>
              </div>

              {/* AI 功能介紹 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-2 text-xs text-purple-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  商品名稱辨識
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-2 text-xs text-purple-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  智慧商品分類
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-2 text-xs text-purple-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  商品詳情生成
                </div>

                <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-2 text-xs text-purple-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  書籍 ISBN 辨識
                </div>
              </div>

              {/* AI 辨識按鈕 */}
              <Button
                type="button"
                onClick={handleAIRecognition}
                disabled={
                  !imageUrl ||
                  aiLoading ||
                  uploadingImage ||
                  isSubmitting
                }
                className="h-12 w-full rounded-xl bg-purple-600 font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AI 正在辨識商品...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />

                    {aiSuccess
                      ? "重新進行 AI 辨識"
                      : "開始 AI 智慧辨識"}
                  </>
                )}
              </Button>

              {/* 尚未上傳照片 */}
              {!imageUrl && (
                <p className="text-center text-xs text-purple-500">
                  請先上傳商品照片，即可使用 AI 智慧辨識。
                </p>
              )}

              {/* AI 辨識中 */}
              {aiLoading && (
                <div
                  role="status"
                  className="space-y-2 rounded-xl border border-purple-100 bg-white/80 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />

                    <p className="text-sm font-medium text-purple-700">
                      正在分析商品照片
                    </p>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-purple-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-purple-500" />
                  </div>

                  <p className="text-xs leading-relaxed text-purple-500">
                    AI 正在辨識商品特徵並整理商品資訊，請稍候，不要關閉頁面。
                  </p>
                </div>
              )}

              {/* AI 辨識成功 */}
              {aiSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-green-800">
                      辨識成功
                    </p>

                    <p className="text-xs leading-relaxed text-green-700">
                      {aiSuccess}
                    </p>
                  </div>
                </div>
              )}

              {/* AI 辨識失敗 */}
              {aiError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-800">
                      AI 辨識失敗
                    </p>

                    <p className="break-words text-xs leading-relaxed text-red-700">
                      {aiError}
                    </p>

                    <p className="text-xs text-red-600">
                      你仍然可以手動填寫商品資訊並正常刊登。
                    </p>
                  </div>
                </div>
              )}

              {/* AI 使用提醒 */}
              <div className="border-t border-purple-200 pt-3">
                <p className="text-xs leading-relaxed text-purple-600">
                  AI 辨識結果僅供參考，可自行修改。
                  商品價格及新舊程度仍須手動填寫。
                  照片將傳送至 Google Gemini 進行辨識，
                  請勿上傳含有個人資料的照片。
                </p>
              </div>
            </div>
          )}

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
              disabled={aiLoading || isSubmitting}
              required
            />
          </div>

          {/* 商品分類 */}
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
              disabled={aiLoading || isSubmitting}
              required
              className="flex h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D95300] disabled:opacity-50"
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

          {/* 商品新舊程度 */}
          <div className="space-y-2">
            <Label htmlFor="condition">
              商品新舊程度 *
            </Label>

            <select
              id="condition"
              name="condition"
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value)
              }
              disabled={isSubmitting}
              required
              className="flex h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D95300]"
            >
              <option value="" disabled>
                請選擇商品新舊程度
              </option>

              {CONDITIONS.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500">
              請依照商品實際使用狀況選擇。
            </p>
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
              disabled={isSubmitting}
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
              placeholder="說明物品瑕疵、面交地點等"
              disabled={aiLoading || isSubmitting}
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
              isSubmitting ||
              uploadingImage ||
              aiLoading
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
            ) : aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI 正在辨識商品...
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
