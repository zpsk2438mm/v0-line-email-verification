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
  const [countdown, setCountdown] = useState(5); // 延長到 5 秒，方便你看清楚
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

  // 成功後的倒數邏輯
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showSuccessModal && countdown === 0) {
      // 這裡暫時註解掉，防止畫面自動跳掉，讓你確認有沒有收到 LINE
      // closeWindow(); 
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown, closeWindow]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    const newImages = filesToAdd.map((file) => ({
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

  // 1. 上傳圖片到 Supabase Storage
  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`圖片上傳中 (${i + 1}/${images.length})...`);
      const fileExt = image.file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${lineUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, image.file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // A. 驗證登入狀態
      if (!lineUserId) throw new Error("尚未取得 LINE ID，請重新整理頁面");

      // B. 上傳圖片
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      setUploadProgress("儲存資料中...");

      // C. 寫入 Supabase Database
      const { error: dbError } = await supabase.from("products").insert({
        name: formData.name,
        category: formData.category,
        price: parseInt(formData.price),
        description: formData.description,
        contact: formData.contact,
        image_url: imageUrls,
        line_user_id: lineUserId,
        verified_email: userEmail
      });

      if (dbError) throw dbError;

      setUploadProgress("發送管理員通知...");

      // D. 呼叫我們寫的 API 送出 LINE 通知
      const notifyRes = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          price: formData.price,
          imageUrl: imageUrls[0] || null,
          contact: formData.contact,
        }),
      });

      if (!notifyRes.ok) {
        console.warn("LINE 通知發送失敗，但商品已成功上架");
      }

      setSubmitStatus("success");
      setShowSuccessModal(true);
      // 清空表單
      setFormData({ name: "", category: "", price: "", description: "", contact: "" });
      setImages([]);
    } catch (err: any) {
      console.error(err);
      setSubmitStatus("error");
      setErrorMessage(err.message || "上架失敗，請檢查網路連線");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">上架成功！</h3>
            <p className="text-gray-500 mb-6">
              管理員已收到通知。<br />
              請確認 LINE 是否有收到訊息。
            </p>
            <Button onClick={() => closeWindow()} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
              完成
            </Button>
            <p className="mt-4 text-xs text-gray-400">若需自動關閉，請手動點擊按鈕</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-md mx-auto bg-white min-h-screen pb-20">
        <h2 className="text-xl font-bold border-l-4 border-blue-600 pl-3">刊登二手物品</h2>
        
        {submitStatus === "error" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm font-medium">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>上傳照片 ({images.length}/{MAX_IMAGES})</Label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg border bg-gray-50 overflow-hidden">
                  <img src={img.preview} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">新增照片</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">商品名稱 *</Label>
            <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="請輸入標題" />
          </div>

          <div className="space-y-2">
            <Label>分類 *</Label>
            <Select required value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
              <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">售價 (NT$) *</Label>
            <Input id="price" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">聯絡方式 *</Label>
            <Input id="contact" required value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="LINE ID 或手機" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">商品描述</Label>
            <Textarea id="desc" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="說明物品新舊狀況..." />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-lg font-bold shadow-lg shadow-blue-100">
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {uploadProgress || "處理中..."}</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> 確認刊登</>
          )}
        </Button>
      </form>
    </>
  );
}
