'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/liff-provider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, X } from 'lucide-react';

interface ProductInitialData {
  id?: string;
  title?: string;
  category?: string;
  price?: number | string;
  contact_info?: string;
  description?: string;
  images?: string[];
}

interface ListingFormProps {
  initialData?: ProductInitialData;
  isEditing?: boolean;
}

export default function ListingForm({ initialData, isEditing = false }: ListingFormProps) {
  const router = useRouter();
  const { lineId, displayName, isLoading: isLiffLoading } = useLiff();
  const { toast } = useToast();

  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [contactInfo, setContactInfo] = useState(initialData?.contact_info || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 上傳圖片至 Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast({
        title: '圖片數量限制',
        description: '最多只能上傳 5 張商品照片！',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    const newUploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          // 嘗試使用相容名稱 bucket
          const { error: fallbackError } = await supabase.storage
            .from('products')
            .upload(filePath, file);

          if (fallbackError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);
          newUploadedUrls.push(publicUrlData.publicUrl);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          newUploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      setImages((prev) => [...prev, ...newUploadedUrls]);
      toast({ title: '上傳成功', description: `成功上傳 ${newUploadedUrls.length} 張圖片` });
    } catch (err: any) {
      console.error('圖片上傳失敗:', err);
      toast({
        title: '圖片上傳失敗',
        description: err.message || '請確認 Supabase Storage bucket 權限設定',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 取得 LINE ID (優先從 Context，次選快取)
    const activeLineId = lineId || (typeof window !== 'undefined' ? localStorage.getItem('line_user_id') : null);

    if (!activeLineId) {
      toast({
        title: '無法讀取 LINE ID',
        description: '請確認是否於 LINE App 內開啟此頁面或完成 LINE 登入。',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !category || !price || !contactInfo.trim()) {
      toast({
        title: '未填寫完整',
        description: '請填寫所有必填欄位（商品名稱、分類、價格、聯絡方式）。',
        variant: 'destructive',
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: '未提供商品照片',
        description: '請至少上傳 1 張商品照片。',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        category,
        price: Number(price),
        contact_info: contactInfo.trim(),
        description: description.trim(),
        images,
        line_user_id: activeLineId,
        seller_name: displayName || '校園賣家',
        status: 'pending', // 規範：新品與修改編輯均強制自動歸類為 pending (待審核)
        updated_at: new Date().toISOString(),
      };

      if (isEditing && initialData?.id) {
        payload.id = initialData.id;
      }

      const { data, error } = await supabase.from('products').upsert(payload).select().single();

      if (error) throw error;

      // 發送後端通知 API 給管理員
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: isEditing ? 'product_updated' : 'product_created',
            productId: data?.id || initialData?.id,
            title: payload.title,
            sellerLineId: activeLineId,
          }),
        });
      } catch (notifyErr) {
        console.warn('管理員通知發送失敗，不影響表單儲存:', notifyErr);
      }

      toast({
        title: isEditing ? '更新成功' : '刊登成功',
        description: '商品已送出審核，管理員審核通過後將公開於市集！',
      });

      router.push('/my-listings');
    } catch (err: any) {
      console.error('儲存失敗:', err);
      toast({
        title: '儲存失敗',
        description: err.message || '無法寫入資料庫',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLiffLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在驗證 LINE 身分與環境...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          {isEditing ? '編輯二手物品' : '刊登二手物品'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 商品照片 */}
          <div className="space-y-2">
            <Label>商品照片 ({images.length}/5) *</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-md overflow-hidden border group">
                  <img src={url} alt={`商品圖 ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary transition bg-gray-50/50">
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">新增照片</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 商品名稱 */}
          <div className="space-y-2">
            <Label htmlFor="title">商品名稱 *</Label>
            <Input
              id="title"
              placeholder="例：大一英文課本 / 羅技無線滑鼠"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 分類與價格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>分類 *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="書籍教材">書籍教材</SelectItem>
                  <SelectItem value="電子產品">電子產品</SelectItem>
                  <SelectItem value="生活用品">生活用品</SelectItem>
                  <SelectItem value="美妝穿搭">美妝穿搭</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">預售價格 (NT$) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="請輸入金額"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 聯絡方式 */}
          <div className="space-y-2">
            <Label htmlFor="contact">聯絡方式 (LINE ID / 手機) *</Label>
            <Input
              id="contact"
              placeholder="例：LINE ID: stust_user / 0912345678"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              required
            />
          </div>

          {/* 商品詳情 */}
          <div className="space-y-2">
            <Label htmlFor="description">商品詳情</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="說明物品新舊程度、面交地點（如：南臺修齊大樓）等"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || uploadingImage}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                資料處理中...
              </>
            ) : isEditing ? (
              '確認修改並送出審核'
            ) : (
              '確認刊登並送出審核'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
