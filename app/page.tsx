"use client";

// components/listing-form.tsx 終極修復對齊版

import { useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, Camera, ChevronDown } from "lucide-react";

// 定義南臺二手市集的分類
const CATEGORIES = ["書籍教材", "日常用品", "文具設備", "遊戲娛樂", "食物/零食", "其他物品"];

export function ListingForm() {
  const { userEmail, lineUserId } = useLiff();
  
  // 表單各個欄位的狀態
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  
  // 圖片與 UI 控制狀態
  const [imageUrl, setImageUrl] = useState(""); // 存單一網址字串
  const [isSelectOpen, setIsSelectOpen] = useState(false); // 控制分類下拉選單
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 模擬照片上傳或直接輸入
  const handleDummyImage = () => {
    // 先給一個隨機的高清物品圖片網址當測試
    setImageUrl("https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError("請選擇商品分類");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      // 🎯 針對大魔王二（RLS 錯誤）的終極防禦線：
      // 1. 確保價格轉成純數字型態 (int4)
      // 2. 確保圖片是一串純文字字串 (text)，如果是空的話給預設圖，絕對不送陣列！
      // 3. 欄位名稱精準咬合你 Supabase 資料庫的 "verified_email"
      const { data, error: supabaseError } = await supabase
        .from("products")
        .insert([
          {
            name: name.trim(),
            price: Number(price), 
            category: category,
            contact: contact.trim(),
            description: description.trim(),
            image_url: imageUrl || "/placeholder-logo.png", // 👈 確保是純文字
            verified_email: userEmail,                     // 👈 欄位精準咬合資料庫
            line_user_id: lineUserId,
            status: "pending", // 預設為審核中
          },
        ]);

      if (supabaseError) throw supabaseError;

      // 上架成功，清空表單
      setSuccess(true);
      setName("");
      setPrice("");
      setCategory("");
      setContact("");
      setDescription("");
      setImageUrl("");
    } catch (err: any) {
      console.error("資料庫寫入失敗原因:", err);
      setError(err.message || "上架失敗，請檢查網路狀態或欄位格式");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-50 space-y-6 max-w-md mx-auto">
      <div className="border-b border-orange-50 pb-3">
        <h3 className="text-xl font-black text-gray-800">刊登二手寶物</h3>
        <p className="text-xs text-gray-400 mt-0.5">填寫下方資訊，讓校園內的同學看見你的商品</p>
      </div>

      {/* 提示訊息 */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-start gap-2 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-600 flex items-start gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>商品已成功送出！請至個人中心查看審核進度。</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 商品名稱 */}
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-600">商品名稱 *</Label>
          <Input 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：星巴克保溫瓶、微積分課本" 
            className="rounded-xl h-11 border-gray-200 focus-visible:ring-[#D95300]"
          />
        </div>

        {/* 🎯 針對大魔王三：客製化分類下拉選單（把衣服穿回來） */}
        <div className="space-y-1.5 relative">
          <Label className="font-bold text-gray-600">商品分類 *</Label>
          <button
            type="button"
            onClick={() => setIsSelectOpen(!isSelectOpen)}
            className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-left text-sm flex items-center justify-between text-gray-700 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#D95300]/20"
          >
            <span>{category || "請選擇分類"}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* ⚡ 下拉內容：強制補上 absolute、z-50、bg-white 擋住後方文字 */}
          {isSelectOpen && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full rounded-2xl border border-gray-100 bg-white p-1.5 shadow-2xl space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setIsSelectOpen(false);
                  }}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-xl font-bold transition-colors ${
                    category === cat 
                      ? "bg-orange-50 text-[#D95300]" 
                      : "text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 商品價格 */}
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-600">欲售價格 (NT$) *</Label>
          <Input 
            required 
            type="number"
            min="0"
            value={price} 
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例如：150" 
            className="rounded-xl h-11 border-gray-200 focus-visible:ring-[#D95300]"
          />
        </div>

        {/* 聯絡方式 */}
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-600">聯絡方式 (LINE ID 或手機) *</Label>
          <Input 
            required 
            value={contact} 
            onChange={(e) => setContact(e.target.value)}
            placeholder="方便買家聯絡你的管道" 
            className="rounded-xl h-11 border-gray-200 focus-visible:ring-[#D95300]"
          />
        </div>

        {/* 商品照片 */}
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-600">商品照片 *</Label>
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={handleDummyImage}
              className="h-20 w-20 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-[#D95300] hover:border-[#D95300] bg-slate-50/50 transition-all shrink-0"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold">{imageUrl ? "已選取 1/1" : "新增照片"}</span>
            </button>
            {imageUrl && (
              <div className="h-20 w-20 rounded-2xl overflow-hidden border relative group">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                <div 
                  onClick={() => setImageUrl("")}
                  className="absolute inset-0 bg-black/40 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                >
                  刪除
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 商品細節描述 */}
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-600">商品描述</Label>
          <Textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            placeholder="請簡單描述一下物品的新舊狀況、面交地點（例如：E棟一樓或校門口）..." 
            className="rounded-xl min-h-[90px] border-gray-200 focus-visible:ring-[#D95300] resize-none"
          />
        </div>

        {/* 提交按鈕 */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-bold rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white transition-all shadow-md mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> 正在安全上架中...
            </span>
          ) : (
            "確認上架商品"
          )}
        </Button>
      </form>
    </div>
  );
}
