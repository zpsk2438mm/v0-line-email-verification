"use client";

import { useState, useRef } from "react";
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
  const { isAuthenticated, userEmail, lineUserId } = useLiff();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setUploadProgress(`圖片上傳中 (${i + 1}/${images.length})...`);
      const fileExt = image.file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${lineUserId || "anonymous"}/${fileName}`;

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

    // 檢查登入狀態
    if (!isAuthenticated || !lineUserId) {
      setSubmitStatus("error");
      setErrorMessage("請先完成 LINE 登入及 Email 驗證後再上架");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      setUploadProgress("儲存資料至資料庫...");

      // 轉換為單一圖片網址字串以吻合資料庫型態
      const singleImageUrl = imageUrls.length > 0 ? imageUrls[0] : "";

      // 1. 資料庫寫入
      const { error: dbError } = await supabase.from("products").insert({
        name: formData.name,
        category: formData.category,
        price: parseInt(formData.price),
        description: formData.description,
        contact: formData.contact,
        image_url: singleImageUrl,
        line_user_id: lineUserId,
        verified_email: userEmail,
        status: 'pending' // 預設審核中
      });

      if (dbError) throw dbError;

      // 2. 傳送 LINE 刊登成功通知 (包在 async 函式內，解決 Top-level await 錯誤)
      setUploadProgress("傳送管理員通知...");
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "INSERT", // 讓後端判定是新上架
            name: formData.name,
            price: formData.price,
            status: "pending",
            line_user_id: lineUserId, // 對齊後端底線命名規格
            verified_email: userEmail
          }),
        });
      } catch (notifyErr) {
        console.error("通知 API 呼叫失敗:", notifyErr);
        // 通知若失敗，不阻斷使用者的流暢體驗
      }

      // 3. 狀態重置與成功彈窗
      setSubmitStatus("success");
      setShowSuccessModal(true);
      setFormData({ name: "", category: "", price: "", description: "", contact: "" });
      setImages([]);
    } catch (err: any) {
      console.error("上架出錯:", err);
      setSubmitStatus("error");
      setErrorMessage(err.message || "上架失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <>
      {/* 成功彈窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-[#D95300]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">上架成功！</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              您的商品已經成功刊登。<br />
              管理員審核通過後即會公開顯示。
            </p>
            <Button 
              onClick={() => setShowSuccessModal(false)} 
              className="w-full bg-[#D95300] hover:bg-[#B84600] h-14 text-lg font-bold rounded-2xl shadow-lg shadow-orange-100 transition-all text-white"
            >
              太棒了！
            </Button>
          </div>
        </div>
      )}

      {/* 表單主體 */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-md mx-auto bg-[#F9F8F6] min-h-screen">
        <header className="flex items-center gap-3 border-b border-orange-100 pb-4 mb-6">
          <div className="w-2 h-8 bg-[#D95300] rounded-full" />
          <h2 className="text-2xl font-black text-gray-800">刊登二手物品</h2>
        </header>

        {submitStatus === "error" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm font-semibold">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-5">
          <section className="space-y-3">
            <Label className="text-base font-bold text-gray-700">商品照片 ({images.length}/{MAX_IMAGES})</Label>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-2xl border-2 border-gray-100 bg-white overflow-hidden group shadow-sm">
                  <img src={img.preview} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(i)} 
                    className="absolute top-1.5 right-1.5 bg-black/50 text
