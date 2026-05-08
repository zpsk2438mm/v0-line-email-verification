"use client";

import { useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, PackagePlus, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function UploadProductPage() {
  const { lineUserId, isAuthenticated, login } = useLiff();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      alert("最多只能上傳 5 張照片");
      return;
    }

    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !lineUserId) return;
    if (images.length === 0) {
      alert("請至少上傳一張照片");
      return;
    }

    try {
      setIsLoading(true);

      // 上傳圖片到 Supabase Storage
      const uploadedUrls = [];
      for (const file of images) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${lineUserId}-${Date.now()}-${Math.random()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);

        if (error) throw error;
        uploadedUrls.push(fileName);
      }

      // 儲存到 Database
      const { error } = await supabase.from("products").insert({
        name,
        price: parseInt(price),
        category,
        description,
        image_url: uploadedUrls, // 存入陣列格式
        line_user_id: lineUserId,
        is_approved: false, // 預設需審核
      });

      if (error) throw error;

      alert("商品已送出審核！");
      router.push("/profile");
    } catch (err) {
      console.error("提交失敗:", err);
      alert("提交失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Button onClick={() => login?.()} className="bg-[#D95300]">請先登入 LINE</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F8F6] pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">刊登新商品</h1>
      </header>

      <div className="mx-auto max-w-md p-4">
        <Alert className="mb-6 bg-amber-50 border-amber-100 text-amber-800 rounded-2xl">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-xs font-bold">上架須知</AlertTitle>
          <AlertDescription className="text-[10px] opacity-80">
            商品送出後需經管理員審核，通過後才會在首頁顯示。
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">商品照片 (最多 5 張)</label>
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                      <img src={src} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-[10px] text-slate-400 mt-1">上傳照片</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">商品名稱</label>
                <Input
                  required
                  placeholder="輸入名稱..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">價格</label>
                <Input
                  required
                  type="number"
                  placeholder="NT$"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">商品分類</label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">商品描述</label>
                <Textarea
                  placeholder="詳細說明商品狀況、新舊、面交地點等..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl border-slate-200 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#D95300] hover:bg-[#B84600] text-white py-6 rounded-2xl font-bold shadow-lg transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <PackagePlus className="mr-2" />}
            確認並送出審核
          </Button>
        </form>
      </div>
    </main>
  );
}
