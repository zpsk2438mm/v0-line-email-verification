
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { contactRequest } from "@/lib/contact-client";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { useLiff } from "@/components/liff-provider";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  Calendar,
  Tag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string | null;
  status: string;
  created_at: string;
  image_url?: unknown;
  images?: unknown;
  line_user_id?: string | null;
  lineUserId?: string | null;
}

function getImageUrl(value: unknown): string {
  const fallback = "/placeholder-logo.png";

  if (!value) return fallback;

  let raw: unknown = value;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        raw = parsed[0];
      }
    } catch {
      // 原本就是一般圖片網址
    }
  }

  if (Array.isArray(raw)) {
    raw = raw[0];
  }

  if (typeof raw !== "string") {
    return fallback;
  }

  const clean = raw.trim();

  if (!clean) return fallback;

  if (
    clean.startsWith("https://") ||
    clean.startsWith("http://")
  ) {
    return clean;
  }

  return (
    "https://arcapfqiihchltdhysea.supabase.co" +
    "/storage/v1/object/public/product-images/" +
    clean.replace(/^\/+/, "")
  );
}

function isValidLineFriendUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    if (url.username || url.password) {
      return false;
    }

    if (
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length
    ) {
