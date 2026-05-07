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

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      if (!lineUserId) throw new Error("尚未登入 LINE，請重新整理頁面");

      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      setUploadProgress("儲存資料至資料庫...");

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

      setUploadProgress("傳送通知至您的 LINE...");

      try {
        // ✅ 這裡修正了：原本 body 裡面漏掉了 lineUserId
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            price: formData.price,
            imageUrl: imageUrls[0] || null,
            contact: formData.contact,
            lineUserId: lineUserId, // 👈 關鍵！補上這行通知 API 才知道要發給誰
          }),
        });
      } catch (notifyErr) {
        console.error("通知 API 呼叫失敗:", notifyErr);
      }

      setSubmitStatus("success");
      setShowSuccessModal(true);
      setFormData({ name: "", category: "", price: "", description: "", contact: "" });
      setImages([]);
    } catch (err: any) {
      console.error("上架出錯:", err);
      setSubmitStatus("error");
      setErrorMessage(err.message || "上架失敗，請開啟 F12 查看報錯內容");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <>
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
              className="w-full bg-[#D95300] hover:bg-[#B84600] h-14 text-lg font-bold rounded-2xl shadow-lg shadow-orange-100 transition-all"
            >
              太棒了！
            </Button>
          </div>
        </div>
      )}

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
                    className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#D95300] hover:bg-orange-50 hover:text-[#D95300] transition-all"
                >
                  <ImagePlus className="w-8 h-8 mb-1" />
                  <span className="text-xs font-bold">新增照片</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          </section>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-bold text-gray-600">商品名稱 *</Label>
              <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="例：大一英文課本" className="rounded-xl h-12 border-gray-200 focus-visible:ring-[#D95300]" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-600">分類 *</Label>
              <Select required value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:ring-[#D95300]"><SelectValue placeholder="請選擇分類" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="focus:bg-orange-50 focus:text-[#D95300]">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price" className="font-bold text-gray-600">預售價格 (NT$) *</Label>
              <Input id="price" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="請輸入金額" className="rounded-xl h-12 border-gray-200 focus-visible:ring-[#D95300]" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact" className="font-bold text-gray-600">聯絡方式 (LINE/手機) *</Label>
              <Input id="contact" required value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="例：Line ID: stust_user" className="rounded-xl h-12 border-gray-200 focus-visible:ring-[#D95300]" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="font-bold text-gray-600">商品詳情</Label>
              <Textarea id="desc" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="說明物品新舊程度、面交地點等..." className="rounded-xl border-gray-200 focus-visible:ring-[#D95300] resize-none" />
            </div>
          </div>
        </div>

        <div className="pt-4 pb-12">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-15 py-7 text-xl font-black rounded-2xl bg-[#D95300] hover:bg-[#B84600] shadow-xl shadow-orange-100 transition-all active:scale-[0.98] text-white"
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> {uploadProgress || "處理中..."}</>
            ) : (
              <><Send className="mr-2 h-6 w-6" /> 立即刊登上架</>
            )}
          </Button>
          <p className="text-center text-[10px] text-gray-400 mt-4 tracking-widest font-bold">SOUTHERN TAIWAN UNIVERSITY OF SCIENCE AND TECHNOLOGY</p>
        </div>
      </form>
    </>
  );
}
