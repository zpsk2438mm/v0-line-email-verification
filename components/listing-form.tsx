"use client";

import { useState } from "react";
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
import { Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { value: "electronics", label: "電子產品" },
  { value: "books", label: "書籍教材" },
  { value: "clothing", label: "服飾配件" },
  { value: "furniture", label: "家具家電" },
  { value: "sports", label: "運動用品" },
  { value: "other", label: "其他" },
];

export function ListingForm() {
  const { isAuthenticated, userEmail, lineUserId } = useLiff();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    contact: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("idle");
    setErrorMessage("");

    // Check if user is authenticated (email verified)
    if (!isAuthenticated) {
      setSubmitStatus("error");
      setErrorMessage("請先完成信箱驗證後再送出商品");
      alert("錯誤：請先完成信箱驗證後再送出商品");
      return;
    }

    if (!userEmail) {
      setSubmitStatus("error");
      setErrorMessage("無法取得已驗證的信箱，請重新驗證");
      alert("錯誤：無法取得已驗證的信箱，請重新驗證");
      return;
    }

    if (!lineUserId) {
      setSubmitStatus("error");
      setErrorMessage("無法取得 LINE 使用者 ID，請重新登入");
      alert("錯誤：無法取得 LINE 使用者 ID，請重新登入");
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.category || !formData.price || !formData.contact) {
      setSubmitStatus("error");
      setErrorMessage("請填寫所有必填欄位");
      alert("錯誤：請填寫所有必填欄位");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert data with correct column names matching your Supabase schema
      const insertData = {
        name: formData.name,
        price: parseInt(formData.price, 10),
        category: formData.category,
        description: formData.description || null,
        contact: formData.contact,
        line_user_id: lineUserId,
        verified_email: userEmail,
      };

      console.log("[v0] Attempting to insert data:", insertData);

      const { data, error } = await supabase.from("products").insert(insertData).select();

      if (error) {
        console.error("[v0] Supabase insert error:", error);
        console.error("[v0] Error code:", error.code);
        console.error("[v0] Error message:", error.message);
        console.error("[v0] Error details:", error.details);
        console.error("[v0] Error hint:", error.hint);
        
        const fullErrorMessage = `Supabase 錯誤: ${error.message}${error.hint ? ` (提示: ${error.hint})` : ""}`;
        setSubmitStatus("error");
        setErrorMessage(fullErrorMessage);
        alert(`送出失敗！\n\n錯誤碼: ${error.code}\n錯誤訊息: ${error.message}\n${error.hint ? `提示: ${error.hint}` : ""}`);
        return;
      }

      console.log("[v0] Insert successful, returned data:", data);
      setSubmitStatus("success");
      setFormData({
        name: "",
        category: "",
        price: "",
        description: "",
        contact: "",
      });
    } catch (error) {
      console.error("[v0] Unexpected error:", error);
      const errorMsg = error instanceof Error ? error.message : "未知錯誤";
      setSubmitStatus("error");
      setErrorMessage(`送出失敗：${errorMsg}`);
      alert(`送出失敗！\n\n錯誤：${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      {/* Status Messages */}
      {submitStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">商品已成功上架！</p>
        </div>
      )}

      {submitStatus === "error" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium break-all">{errorMessage}</p>
        </div>
      )}

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
            送出中...
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
    </form>
  );
}
