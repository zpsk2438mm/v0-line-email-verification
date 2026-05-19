"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation"; // 🎯 引入 Next.js 路由工具
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
import { Send, Loader2, AlertCircle, ImagePlus, X, CheckCircle, Save } from "lucide-react";
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
  file: File | null; // 🎯 修正型別：允許為 null，因為資料庫抓過來的舊照片沒有 File 物件
  preview: string;
}

// 🎯 1. 宣告接收外部傳入參數的 Props 介面
interface ListingFormProps {
  isEditMode?: boolean;
  initialData?: any;
}

export function ListingForm({ isEditMode = false, initialData }: ListingFormProps) {
  const router = useRouter(); // 🎯 初始化路由跳轉
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

  // 🎯 2. 重磅回歸：當頁面收到 initialData 舊資料時，自動灌進表單 state 裡！
  useEffect(() => {
    if (isEditMode && initialData) {
      console.log("🛠️ Form 元件成功接收並開始注入舊資料:", initialData);
      setFormData({
        name: initialData.name || "",
        category: initialData.category || "",
        price: initialData.price?.toString() || "",
        description: initialData.description || "",
        contact: initialData.contact || "",
      });

      // 自動解析圖片欄位（兼容字串網址或陣列欄位）
      let rawImage = initialData.image_url || initialData.images;
      if (rawImage) {
        try {
          let urlString = Array.isArray(rawImage) ? rawImage[0] : String(rawImage);
          if (urlString.startsWith("[")) {
            const parsed = JSON.parse(urlString);
            urlString = Array.isArray(parsed) ? parsed[0] : urlString;
          }
          const cleanUrl = urlString.trim().replace(/[\[\]"']/g, "");
          if (cleanUrl.startsWith("http")) {
            setImages([{ file: null, preview: cleanUrl }]);
          }
        } catch (e) {
          console.error("解析舊圖片網址失敗", e);
        }
      }
    }
  }, [isEditMode, initialData]);

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
      // 如果它是有 File 物件的新上傳照片，才需要釋放記憶體網址
      if (newImages[index].file) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // 🎯 3. 優化圖片上傳：如果 file 是 null，代表它是本來就在資料庫的舊照片，不需重複上傳，直接保留原網址
      if (!image.file) {
        uploadedUrls.push(image.preview);
        continue;
      }

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

    if (!images || images.length === 0) {
      setSubmitStatus("error");
      setErrorMessage("請至少上傳 1 張商品照片，以便同學參考物品狀況。");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!isAuthenticated || !lineUserId) {
      setSubmitStatus("error");
      setErrorMessage("請先完成 LINE 登入及 Email 驗證後再進行操作");
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
      const singleImageUrl = imageUrls.length > 0 ? imageUrls[0] : "";

      if (isEditMode) {
        // 🎯 4. 編輯模式分支：使用 .update() 更新特定 ID 商品，且強制回歸 'pending' 重新審核
        const { error: dbError } = await supabase
          .from("products")
          .update({
            name: formData.name,
            category: formData.category,
            price: parseInt(formData.price),
            description: formData.description,
            contact: formData.contact,
            image_url: singleImageUrl,
            status: "pending" // ⭐️ 強制調回 pending！讓瀏覽市集與個人中心卡片依你要求立刻隱藏消失！
          })
          .eq("id", initialData.id);

        if (dbError) throw dbError;
      } else {
        // 5. 原生上架模式分支：使用 .insert() 寫入全新商品資料
        const { error: dbError } = await supabase.from("products").insert({
          name: formData.name,
          category: formData.category,
          price: parseInt(formData.price),
          description: formData.description,
          contact: formData.contact,
          image_url: singleImageUrl,
          line_user_id: lineUserId,
          verified_email: userEmail,
          status: "pending"
        });

        if (dbError) throw dbError;
      }

      // 6. 呼叫通知 API（帶入對應的 INSERT 或 UPDATE 動作類型）
      setUploadProgress("傳送管理員通知...");
      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: isEditMode ? "UPDATE" : "INSERT",
            name: formData.name,
            price: formData.price,
            status: "pending",
            line_user_id: lineUserId,
            verified_email: userEmail,
            productImage: singleImageUrl 
          }),
        });
      } catch (notifyErr) {
        console.error("通知 API 呼叫失敗:", notifyErr);
      }

      setSubmitStatus("success");
      setShowSuccessModal(true);
      
      if (!isEditMode) {
        // 只有全新上架才需要清空欄位，修改模式的話保持原樣就行
        setFormData({ name: "", category: "", price: "", description: "", contact: "" });
        setImages([]);
      }
    } catch (err: any) {
      console.error("處理失敗出錯:", err);
      setSubmitStatus("error");
      setErrorMessage(err.message || "操作失敗，請稍後再試");
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
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              {isEditMode ? "修改已送審！" : "上架成功！"}
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {isEditMode 
                ? "商品已成功更新並重新送審，卡片在審核通過前將暫時撤下。" 
                : "您的商品已經成功刊登。管理員審核通過後即會公開顯示。"}
            </p>
            <Button 
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/my-listings"); // 🎯 儲存完按下確認，自動重新導向回個人中心
              }} 
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
          <h2 className="text-2xl font-black text-gray-800">
            {isEditMode ? "修改商品資料" : "刊登二手物品"}
          </h2>
        </header>

        {submitStatus === "error" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm font-semibold">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-5">
          <section className="space-y-3">
            <Label className="text-base font-bold text-gray-700">商品照片 ({images.length}/{MAX_IMAGES}) <span className="text-red-500">*</span></Label>
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
                <SelectContent className="rounded-xl z-50 bg-white shadow-2xl border border-gray-100">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="focus:bg-orange-50 focus:text-[#D95300] font-medium">{c.label}</SelectItem>)}
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
            ) : isEditMode ? (
              <><Save className="mr-2 h-6 w-6" /> 儲存並重新送審</>
            ) : (
              <><Send className="mr-2 h-6 w-6" /> 立即刊登上架</>
            )}
          </Button>
          <p className="text-center text-[10px] text-gray-400 mt-4 tracking-widest font-bold uppercase">Southern Taiwan University of Science and Technology</p>
        </div>
      </form>
    </>
  );
}
