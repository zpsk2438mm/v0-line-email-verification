"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Send, Loader2, AlertCircle, ImagePlus, X, CheckCircle } from "lucide-react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { value: "electronics", label: "電子產品" },
  { value: "books", label: "書籍教材" },
  { value: "tools_stationery", label: "文具/專業工具" },
  { value: "dorm_supplies",label: "租屋收納/雜貨" }，
  { value: "gaming_hobbies",label: "電玩/遊戲/娛樂" }，
  { value: "clothing", label: "服飾配件" },
  { value: "furniture", label: "家具家電" },
  { value: "sports", label: "運動用品" },
  { value: "other", label: "其他" },
];

const MAX_IMAGES = 5;

interface ImagePreview {
  file: File;
  preview: string;
}

export function ListingForm() {
  const { isAuthenticated, userEmail, lineUserId, sendLineMessage, closeWindow } = useLiff();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    contact: "",
  });

  // Countdown timer for auto close
  useEffect(() => {
    if (showSuccessModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showSuccessModal && countdown === 0) {
      closeWindow();
    }
  }, [showSuccessModal, countdown, closeWindow]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newImages: ImagePreview[] = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`上傳圖片中 (${i + 1}/${images.length})...`);
      
      const fileExt = image.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${lineUserId || "anonymous"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, image.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("[v0] Image upload error:", uploadError);
        throw new Error(`圖片上傳失敗: ${uploadError.message}`);
      }

      // Get the full public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    setUploadProgress("");
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("idle");
    setErrorMessage("");

    // Check if user is authenticated (email verified)
    if (!isAuthenticated) {
      setSubmitStatus("error");
      setErrorMessage("請先完成信箱驗證後再送出商品");
      return;
    }

    if (!userEmail) {
      setSubmitStatus("error");
      setErrorMessage("無法取得已驗證的信箱，請重新驗證");
      return;
    }

    if (!lineUserId) {
      setSubmitStatus("error");
      setErrorMessage("無法取得 LINE 使用者 ID，請重新登入");
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.category || !formData.price || !formData.contact) {
      setSubmitStatus("error");
      setErrorMessage("請填寫所有必填欄位");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (images.length > 0) {
        setUploadProgress("準備上傳圖片...");
        imageUrls = await uploadImages();
      }

      setUploadProgress("儲存商品資料...");

      // Insert data with correct column names matching your Supabase schema
      const insertData = {
        name: formData.name,
        price: parseInt(formData.price, 10),
        category: formData.category,
        description: formData.description || null,
        contact: formData.contact,
        image_url: imageUrls.length > 0 ? imageUrls : null,
        line_user_id: lineUserId,
        verified_email: userEmail,
      };

      const { data, error } = await supabase.from("products").insert(insertData).select();

      if (error) {
        console.error("[v0] Supabase insert error:", error);
        const fullErrorMessage = `資料庫錯誤: ${error.message}${error.hint ? ` (${error.hint})` : ""}`;
        setSubmitStatus("error");
        setErrorMessage(fullErrorMessage);
        setUploadProgress("");
        return;
      }

      // Send LINE message
      setUploadProgress("發送 LINE 通知...");
      const price = parseInt(formData.price, 10);
      const firstImageUrl = imageUrls.length > 0 ? imageUrls[0] : undefined;
      
      await sendLineMessage(formData.name, price, firstImageUrl);

      setUploadProgress("");
      setSubmitStatus("success");
      setShowSuccessModal(true);
      setCountdown(3);
      
      // Reset form
      setFormData({
        name: "",
        category: "",
        price: "",
        description: "",
        contact: "",
      });
      
      // Clear images
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    } catch (error) {
      console.error("[v0] Unexpected error:", error);
      const errorMsg = error instanceof Error ? error.message : "未知錯誤";
      setSubmitStatus("error");
      setErrorMessage(`送出失敗：${errorMsg}`);
      setUploadProgress("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    closeWindow();
  };

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-8 max-w-sm w-full text-center shadow-lg border border-border animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">上架成功</h3>
            <p className="text-muted-foreground mb-2">
              您的商品已送出，目前正在審核中。
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              審核通過後將會上架顯示。
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {countdown > 0 ? `${countdown} 秒後自動關閉...` : "正在關閉..."}
            </p>
            <Button
              onClick={handleCloseSuccess}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              立即關閉
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Error Message */}
        {submitStatus === "error" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium break-all">{errorMessage}</p>
          </div>
        )}

        {/* Image Upload */}
        <div className="space-y-2">
          <Label className="text-foreground">
            商品照片 <span className="text-muted-foreground text-xs">(最多 {MAX_IMAGES} 張)</span>
          </Label>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Image Previews */}
            {images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={image.preview}
                  alt={`預覽 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add Image Button */}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">新增照片</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground">
            商品名稱 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="例：微積分課本 第八版"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-card border-border"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="text-foreground">
            商品類別 <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
            disabled={isSubmitting}
            required
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="選擇類別" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price" className="text-foreground">
            售價 <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              NT$
            </span>
            <Input
              id="price"
              type="number"
              placeholder="0"
              className="pl-12 bg-card border-border"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              min="0"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-foreground">
            商品描述
          </Label>
          <Textarea
            id="description"
            placeholder="請描述商品狀況、使用時間等資訊..."
            rows={4}
            className="bg-card border-border resize-none"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            disabled={isSubmitting}
          />
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <Label htmlFor="contact" className="text-foreground">
            聯絡方式 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact"
            placeholder="LINE ID 或手機號碼"
            className="bg-card border-border"
            value={formData.contact}
            onChange={(e) =>
              setFormData({ ...formData, contact: e.target.value })
            }
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {uploadProgress || "處理中..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              送出上架
            </>
          )}
        </Button>

        {/* Email verification notice */}
        {userEmail && (
          <p className="text-xs text-center text-muted-foreground">
            已驗證信箱：{userEmail}
          </p>
        )}

        {/* Hidden Debug Mode - shows first 4 chars of LINE ID */}
        <div className="pt-4 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground/50 text-center select-none">
            Debug: {lineUserId ? `${lineUserId.substring(0, 4)}****` : "N/A"}
          </p>
        </div>
      </form>
    </>
  );
}
