
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

  const fetchMyProducts = useCallback(async () => {
    if (!isAuthenticated || !lineUserId) {
      setIsLoadingProducts(false);
      return;
    }

    try {
      setIsLoadingProducts(true);

      const cacheKey = `products_${lineUserId}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          setMyProducts(JSON.parse(cachedData));
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, price, status, created_at, image_url"
        )
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData: MyProduct[] = (data || []).map(
        (item) => {
          let displayImg = "/placeholder-logo.png";

          if (item.image_url) {
            if (Array.isArray(item.image_url)) {
              displayImg =
                item.image_url[0] || displayImg;
            } else if (typeof item.image_url === "string") {
              if (item.image_url.startsWith("[")) {
                try {
                  const images = JSON.parse(item.image_url);

                  if (
                    Array.isArray(images) &&
                    images.length > 0
                  ) {
                    displayImg = images[0];
                  }
                } catch {
                  displayImg = item.image_url;
                }
              } else {
                displayImg = item.image_url;
              }
            }
          }

          return {
            ...item,
            display_image: displayImg,
          };
        }
      );

      setMyProducts(formattedData);

      localStorage.setItem(
        cacheKey,
        JSON.stringify(formattedData)
      );
    } catch (err) {
      console.error("個人商品讀取失敗:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isAuthenticated, lineUserId]);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // 讀取賣家已儲存的 LINE 加好友連結
  useEffect(() => {
    if (!isAuthenticated || !lineUserId) {
      setLoadingContact(false);
      return;
    }

    let cancelled = false;

    async function loadContact() {
      try {
        setLoadingContact(true);
        setContactError("");

        const data = await contactRequest(
          "/api/seller-contact"
        );

        if (!cancelled) {
          setLineFriendUrl(data.lineFriendUrl || "");
        }
      } catch (err) {
        if (!cancelled) {
          setContactError(
            err instanceof Error
              ? err.message
              : "無法讀取 LINE 聯絡方式"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingContact(false);
        }
      }
    }

    loadContact();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, lineUserId]);

  // 儲存 LINE 加好友連結
  const saveContact = async () => {
    setContactMessage("");
    setContactError("");

    const cleanUrl = lineFriendUrl.trim();

    if (cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);

        if (
          parsed.protocol !== "https:" ||
          !(
            (parsed.hostname === "line.me" &&
              parsed.pathname.startsWith("/ti/p/")) ||
            parsed.hostname === "lin.ee"
          )
        ) {
          setContactError(
            "請輸入有效的 LINE 加好友連結"
          );
          return;
        }
      } catch {
        setContactError(
          "連結格式錯誤，請檢查後再試"
        );
        return;
      }
    }

    try {
      setSavingContact(true);

      await contactRequest(
        "/api/seller-contact",
        "PUT",
        {
          lineFriendUrl: cleanUrl,
        }
      );

      setLineFriendUrl(cleanUrl);
      setContactMessage("LINE 加好友連結已成功儲存！");
    } catch (err) {
      setContactError(
        err instanceof Error
          ? err.message
          : "儲存失敗，請稍後再試"
      );
    } finally {
      setSavingContact(false);
    }
  };

  if (liffLoading || !isAuthenticated || !lineUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95300] mb-4" />
        <p className="text-gray-500 font-bold">
          正在同步您的 LINE 個人資料...
        </p>
      </div>
    );
  }

  const previewProducts = myProducts.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">
          個人中心
        </h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 個人資料 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-8 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/20 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img
                    src={userProfile.pictureUrl}
                    alt="LINE 頭像"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">
                  {userProfile?.displayName ||
                    userName ||
                    "南臺同學"}
                </h2>

                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <p className="text-[11px] font-bold uppercase flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {userEmail || "已驗證南臺信箱"}
                  </p>

                  <p className="text-[10px] font-bold opacity-70">
                    LINE 帳號已連結
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 功能選單 */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/my-listings" className="block">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800"
            >
              <div className="p-3 bg-orange-50 rounded-xl">
                <Package className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">
                我的商品
              </span>
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800"
            >
              <div className="p-3 bg-orange-50 rounded-xl">
                <Plus className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">
                我要刊登
              </span>
            </Button>
          </Link>
        </div>

        {/* 新增：LINE 加好友連結設定 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-5 space-y-4">
          <h3 className="font-black text-base text-slate-700 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#D35400]" />
            我的 LINE 加好友連結
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            請從 LINE 的「加入好友 → 我的行動條碼」
            取得個人加好友連結。
            買家完成 LINE 與南臺信箱驗證後，
            就可以透過這個連結聯絡你。
          </p>

          <Input
            type="url"
            placeholder="https://line.me/ti/p/..."
            value={lineFriendUrl}
            onChange={(e) => {
              setLineFriendUrl(e.target.value);
              setContactMessage("");
              setContactError("");
            }}
            disabled={loadingContact || savingContact}
            className="rounded-xl"
          />

          <Button
            type="button"
            onClick={saveContact}
            disabled={loadingContact || savingContact}
            className="w-full h-11 bg-[#D35400] hover:bg-[#A04000] text-white font-bold rounded-xl"
          >
            {loadingContact
              ? "正在讀取..."
              : savingContact
                ? "儲存中..."
                : "儲存 LINE 聯絡方式"}
          </Button>

          {contactMessage && (
            <p
              role="status"
              className="text-sm text-emerald-600 font-medium"
            >
              {contactMessage}
            </p>
          )}

          {contactError && (
            <p
              role="alert"
              className="text-sm text-red-600 font-medium"
            >
              {contactError}
            </p>
          )}
        </Card>

        {/* 最近發布商品 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-5">
          <div className="flex items-center justify-between mb-4 border-b border-orange-50/60 pb-3">
            <h3 className="font-black text-base text-slate-700">
              最近發布商品
            </h3>
          </div>

          {isLoadingProducts && myProducts.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
              目前還沒有上架過商品喔！
            </div>
          ) : (
            <div className="grid gap-3">
              {previewProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 border border-orange-50/60 rounded-[22px] bg-[#FFFDFB]/50"
                >
                  <div className="h-14 w-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={
                        p.display_image ||
                        "/placeholder-logo.png"
                      }
                      className="w-full h-full object-cover"
                      alt={p.name}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 truncate">
                      {p.name}
                    </h4>
                    <p className="text-[#D35400] font-black text-sm">
                      NT$ {p.price}
                    </p>
                  </div>

                  {p.status === "approved" ? (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 border-none shadow-none flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      已上架
                    </Badge>
                  ) : p.status === "rejected" ? (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 border-none shadow-none flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      已退回
                    </Badge>
                  ) : (
                    <Badge className="rounded-xl px-2 py-0.5 text-[10px] font-bold bg-orange-50 text-[#D35400] border-none shadow-none flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      審核中
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
