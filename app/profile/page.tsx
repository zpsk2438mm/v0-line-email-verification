"use client";

import { useEffect, useState, useCallback } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { contactRequest } from "@/lib/contact-client";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Package,
  Mail,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

interface MyProduct {
  id: string;
  name: string;
  price: number;
  status: string;
  created_at: string;
  image_url?: string | string[] | null;
  display_image?: string;
}

export default function ProfilePage() {
  const {
    lineUserId,
    userProfile,
    userEmail,
    isAuthenticated,
    userName,
    isLoading: liffLoading,
  } = useLiff();

  const [myProducts, setMyProducts] = useState<MyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [lineFriendUrl, setLineFriendUrl] = useState("");
  const [loadingContact, setLoadingContact] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactError, setContactError] = useState("");

  // 讀取我的商品
  const fetchMyProducts = useCallback(async () => {
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);

      // 不先顯示 localStorage 舊資料，避免違規下架後仍顯示已上架。
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, price, status, created_at, image_url"
        )
        .eq("line_user_id", lineUserId)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      const formattedData: MyProduct[] = (
        data || []
      ).map((item) => {
        let displayImg = "/placeholder-logo.png";

        if (item.image_url) {
          if (Array.isArray(item.image_url)) {
            displayImg =
              item.image_url[0] || displayImg;
          } else if (
            typeof item.image_url === "string"
          ) {
            if (item.image_url.startsWith("[")) {
              try {
                const images = JSON.parse(
                  item.image_url
                );

                if (
