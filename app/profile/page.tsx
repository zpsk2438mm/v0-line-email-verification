"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, CheckCircle, Clock } from "lucide-react"; 
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  is_approved: boolean;
  image_url: any;
}

export default function ProfilePage() {
  const { lineUserId, userProfile, isAuthenticated, login, isLoading: liffLoading } = useLiff();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // 自動觸發 LINE 登入驗證
  useEffect(() => {
    if (!liffLoading && !isAuthenticated) {
      login?.();
    }
  }, [isAuthenticated, liffLoading, login]);

  // 抓取該使用者的刊登商品
  useEffect(() => {
    if (!isAuthenticated || !lineUserId) return;
    async function fetchMyProducts() {
      try {
        setIsLoadingProducts(true);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, is_approved, image_url")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMyProducts(data || []);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchMyProducts();
  }, [isAuthenticated, lineUserId]);

  // 修正商品圖片解析邏輯
  const getCleanImageUrl = (img: any) => {
    if (!img) return "/placeholder.png"; 
    let url = Array.isArray(img) ? img[0] : String(img).replace(/[\[\]"'\\]/g, "").trim();
    if (url.startsWith("http")) return url;
    return `https://arcapfqiihchltdhysea.supabase.co/storage/v1/object/public/product-images/${url.replace(/^\//, "")}`;
  };

  if (liffLoading || !isAuthenticated) {
    return <div className="h-screen flex items-center justify-center font-bold">載入中...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py
