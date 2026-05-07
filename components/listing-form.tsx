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
  { value: "dorm_supplies", label: "租屋收納/雜貨" },
  { value: "hobbies", label: "遊戲/娛樂"},
  { value: "cosmetics", label: "化妝品/美妝"},
  { value: "food", label: "食物/零食"},
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
  const { isAuthenticated, userEmail, lineUserId, closeWindow } = useLiff();
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

  // 成功後倒數計時並自動關閉
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // 上傳圖片到 Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`圖片上傳中 (${i + 1}/${images.length})...`);
      const fileExt = image.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${lineUserId || "anonymous"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, image.file);

      if (uploadError) throw new Error(`圖片上傳失敗: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("idle");
    setErrorMessage("");

    if (!isAuthenticated || !userEmail || !lineUserId) {
      setSubmitStatus("error");
      setErrorMessage("請確保已完成 LINE 登入與信箱驗證");
      return;
    }

    if (!formData.name || !formData.category || !formData.price || !formData.contact) {
      setSubmitStatus("error");
      setErrorMessage("請填寫所有必填欄位");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 上傳圖片
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      setUploadProgress("儲存商品資料...");

      // 2. 寫入資料庫 (請確保資料表名稱為 products)
      const { error: dbError } = await supabase.from("products").insert({
        name: formData.name,
        price: parseInt(formData.price, 10),
        category: formData.category,
        description: formData.description,
        contact: formData.contact,
        image_url: imageUrls.length > 0 ? imageUrls : null,
        line_user_id: lineUserId,
        verified_email: userEmail,
      });

      if (dbError) throw new Error(dbError.message);

      // 3. 發送 LINE 通知 (呼叫我們剛建的 API)
      setUploadProgress("發送 LINE 通知...");
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            price: parseInt(formData.price, 10),
            imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
            contact: formData.contact,
          }),
        });
      } catch (err) {
        console.error("通知發送失敗(不影響上架):", err);
      }

      setUploadProgress("");
      setSubmitStatus("success");
      setShowSuccessModal(true);
      
      // 重置表單
      setFormData({ name: "", category: "", price: "", description: "", contact: "" });
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error.message || "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <>
      {/* 成功彈窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-lg border">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">上架成功</h3>
            <p className="text-sm text-gray-500 mb-6">您的商品已送出審核。<br/>{countdown} 秒後自動關閉...</p>
            <Button onClick={() => closeWindow()} className="w-full bg-green-600">立即關閉</Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 space-y-5 max-w-md mx-auto bg-white min-h-screen">
        {submitStatus === "error" && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* 圖片上傳區 */}
        <div className="space-y-2">
          <Label>商品照片 (最多 {MAX_IMAGES} 張)</Label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={image.preview} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px]">新增照片</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
        </div>

        {/* 商品內容 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">商品名稱 *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例：微積分課本" required />
          </div>

          <div className="space-y-1">
            <Label>類別 *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue placeholder="選擇類別" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="price">售價 *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">NT$</span>
              <Input id="price" type="number" className="pl-10" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0" required />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">描述</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="物品狀況說明..." />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact">聯絡方式 *</Label>
            <Input id="contact" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="LINE ID 或手機" required />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{uploadProgress || "處理中..."}</>
          ) : (
            <><Send className="w-5 h-5 mr-2" />送出上架</>
          )}
        </Button>
      </form>
    </>
  );
}
