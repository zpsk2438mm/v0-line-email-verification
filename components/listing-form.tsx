
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
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

// ==========================================
// 商品分類
// ==========================================

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

// ==========================================
// 商品新舊程度
// ==========================================

const CONDITIONS = [
  { id: "new_sealed", label: "全新未拆封" },
  { id: "new_opened", label: "全新已拆封" },
  { id: "like_new", label: "近全新（9成新以上）" },
  { id: "good", label: "保存良好（7～8成新）" },
  { id: "fair", label: "有使用痕跡（5～6成新）" },
  { id: "used", label: "明顯使用痕跡（5成新以下）" },
];

// ==========================================
// 商品圖片自動壓縮
// ==========================================

async function compressImageForAI(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  const maxBytes = 280 * 1024;
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("無法讀取圖片，請使用 JPG 或 PNG 照片。"));
      img.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || !img.naturalWidth || !img.naturalHeight) {
      throw new Error("無法處理商品照片。");
    }
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    for (const maxSide of [1200, 1000, 800, 640, 480, 320]) {
      const scale = Math.min(1, maxSide / longest);
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
        const result = canvas.toDataURL("image/jpeg", quality);
        if (!result.startsWith("data:image/jpeg;base64,")) continue;
        const base64 = result.split(",")[1];
        if (base64 && atob(base64).length <= maxBytes) return base64;
      }
    }
    throw new Error("圖片無法壓縮至 280 KiB 以下，請更換照片。");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ==========================================
// 商品刊登表單
// ==========================================

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

  const [imageUrl, setImageUrl] = useState(
    initialData?.image_url ||
      initialData?.images?.[0] ||
      ""
  );

  // ========================================
  // 圖片所有權憑證
  // ========================================

  const [imageToken, setImageToken] =
    useState("");

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

  // 保存實際上傳的壓縮圖片

  const [selectedImageFile, setSelectedImageFile] =
    useState<File | null>(null);

  // ==========================================
  // AI 智慧商品辨識
  // ==========================================

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

      // 優先使用已上傳的壓縮圖片

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

      // 呼叫 AI 智慧上架 API

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

  // ==========================================
  // 安全圖片上傳及自動壓縮
  // ==========================================

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

    const input = e.currentTarget;

    const file = input.files?.[0];

    if (!file) return;

    // 1. 驗證使用者身分

    if (
      !lineUserId ||
      !isAuthenticated ||
      !userEmail
        ?.toLowerCase()
        .endsWith("@stust.edu.tw")
    ) {
      setSubmitError(
        "請先完成 LINE 登入及學校信箱驗證。"
      );

      input.value = "";
      return;
    }

    // 2. 驗證圖片格式

    if (!file.type.startsWith("image/")) {
      toast({
        title: "檔案格式錯誤",
        description: "請選擇圖片檔案。",
        variant: "destructive",
      });

      input.value = "";
      return;
    }

    // 3. 驗證原始圖片大小

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "圖片太大",
        description: "請選擇 10MB 以內的圖片。",
        variant: "destructive",
      });

      input.value = "";
      return;
    }

    setUploadingImage(true);
    setSubmitError("");
    setAiError("");
    setAiSuccess("");

    try {
      // 4. 自動壓縮圖片

      const compressedImage =
        await compressImageForAI(file);

      // 5. 建立壓縮後的圖片檔案

      const binary = atob(compressedImage);

      const bytes = new Uint8Array(
        binary.length
      );

      for (
        let i = 0;
        i < binary.length;
        i++
      ) {
        bytes[i] = binary.charCodeAt(i);
      }

      const compressedFile = new File(
        [bytes],
        "product-image.jpg",
        {
          type: "image/jpeg",
        }
      );

      // 6. 呼叫安全圖片上傳 API

      // 上傳前再次確認圖片實際容量

if (
  compressedFile.size === 0 ||
  compressedFile.size > 300 * 1024 ||
  binary.length !== compressedFile.size
) {
  throw new Error(
    "商品照片容量驗證失敗，請重新選擇照片。"
  );
}

console.log("[Product Image] 圖片壓縮結果", {
  originalBytes: file.size,
  compressedBytes: compressedFile.size,
  compressedKiB: Number(
    (compressedFile.size / 1024).toFixed(2)
  ),
  limitBytes: 300 * 1024,
});

// 6. 呼叫安全圖片上傳 API

      // 7. 驗證後端回傳的網址及憑證

      if (
        !result?.success ||
        typeof result.imageUrl !== "string" ||
        !result.imageUrl.trim() ||
        typeof result.imageToken !== "string" ||
        !result.imageToken.trim()
      ) {
        throw new Error(
          result?.error ||
            "無法取得商品照片或圖片驗證憑證。"
        );
      }

      // 8. 保存商品照片及所有權憑證

      setImageUrl(result.imageUrl);

      setImageToken(result.imageToken);

      // 保存實際上傳的圖片供 AI 辨識

      setSelectedImageFile(compressedFile);

      // 9. 顯示成功訊息

      toast({
        title: "圖片上傳成功",
        description:
          "商品照片已自動壓縮並安全上傳。",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "圖片上傳失敗，請稍後再試。";

      setSubmitError(message);

      toast({
        title: "圖片上傳失敗",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  };

  // ==========================================
  // 移除商品照片及圖片憑證
  // ==========================================

  const handleRemoveImage = () => {
    if (
      aiLoading ||
      isSubmitting ||
      uploadingImage
    ) {
      return;
    }

    setImageUrl("");

    setImageToken("");

    setSelectedImageFile(null);

    setAiError("");

    setAiSuccess("");
  };

  // ==========================================
  // 安全商品刊登與編輯
  // ==========================================

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

    // 1. 確認 LINE 登入

    if (!lineUserId) {
      setSubmitError(
        "無法取得 LINE 身分，請重新登入。"
      );
      return;
    }

    // 2. 確認學校信箱驗證

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

    // 3. 驗證商品基本資料

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

    if (title.trim().length > 100) {
      setSubmitError(
        "商品名稱不得超過 100 字。"
      );
      return;
    }

    if (description.trim().length > 2000) {
      setSubmitError(
        "商品詳情不得超過 2000 字。"
      );
      return;
    }

    // 4. 驗證商品分類

    const categoryExists = CATEGORIES.some(
      (item) => item.id === category
    );

    if (!categoryExists) {
      setSubmitError(
        "請重新選擇商品分類。"
      );
      return;
    }

    // 5. 驗證商品新舊程度

    const conditionExists = CONDITIONS.some(
      (item) => item.id === condition
    );

    if (!conditionExists) {
      setSubmitError(
        "請選擇商品新舊程度。"
      );
      return;
    }

    // 6. 驗證商品價格

    const numericPrice = Number(price);

    if (
      !Number.isSafeInteger(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > 2147483647
    ) {
      setSubmitError(
        "請輸入有效的整數商品價格。"
      );
      return;
    }

    // 7. 確認商品照片

    if (!imageUrl) {
      setSubmitError(
        "請先上傳商品照片。"
      );
      return;
    }

    // ======================================
    // 8. 確認圖片所有權憑證
    // ======================================

    const originalImageUrl =
      initialData?.image_url ||
      initialData?.images?.[0] ||
      "";

    const keepingOriginalImage =
      isEditing &&
      Boolean(originalImageUrl) &&
      imageUrl === originalImageUrl;

    // 新增商品或更換照片必須具有憑證
    // 編輯商品且保留原照片時不需要重新上傳

    if (
      !keepingOriginalImage &&
      !imageToken.trim()
    ) {
      setSubmitError(
        "缺少商品照片驗證憑證，請移除照片後重新上傳。"
      );
      return;
    }

    // 9. 確認編輯商品 ID

    if (isEditing && !initialData?.id) {
      setSubmitError(
        "找不到要編輯的商品 ID。"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 10. 建立商品提交資料
      // 不由前端指定賣家身分或審核結果

      const payload = {
        ...(isEditing
          ? {
              productId: initialData?.id,
            }
          : {}),

        name: title.trim(),

        category,

        condition,

        price: numericPrice,

        description: description.trim(),

        image_url: imageUrl,

        // 傳遞圖片所有權憑證

        imageToken,
      };

      console.log(
        "[Product Submit] 準備提交商品",
        {
          category,
          condition,
          price: numericPrice,
          hasImage: Boolean(imageUrl),
          hasImageToken: Boolean(imageToken),
          isEditing,
        }
      );

      // 11. 呼叫安全商品刊登 API

      const result = await contactRequest(
        "/api/product-submit",
        isEditing ? "PUT" : "POST",
        payload
      );

      if (
        result?.success !== true ||
        typeof result?.productId !== "string" ||
        !result.productId
      ) {
        throw new Error(
          result?.error ||
            "無法確認商品儲存結果，請先至我的商品確認。"
        );
      }

      console.log(
        "[Product Submit] 商品儲存成功",
        {
          productId: result.productId,
          status: result.status,
          aiReviewStatus:
            result.aiReviewStatus,
        }
      );

      // LINE 通知交由 Supabase
      // product_line_notification 觸發器處理
      // 不再由前端重複呼叫 /api/notify

      // 12. 顯示成功提示

      toast({
        title: isEditing
          ? "更新成功"
          : "刊登成功",

        description:
          "商品已送出審核，審核通過後將公開於市集！",
      });

      // 13. 返回我的商品

      router.push("/my-listings");
      router.refresh();
    } catch (err: unknown) {
      console.error(
        "[Product Submit] 商品儲存失敗:",
        err
      );

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

  // ==========================================
  // LINE 登入載入畫面
  // ==========================================

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

  // ==========================================
  // 商品刊登介面
  // ==========================================

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

            <p className="text-xs text-slate-500">
              支援 10MB 以內的照片，系統將自動壓縮後上傳。
            </p>
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
              maxLength={100}
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
              max="2147483647"
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
              maxLength={2000}
              className="rounded-xl"
            />
          </div>

          {/* 商品儲存錯誤訊息 */}

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
