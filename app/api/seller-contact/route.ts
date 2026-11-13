
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validLineUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "line.me" &&
      url.pathname.startsWith("/ti/p/") &&
      url.pathname.length > "/ti/p/".length &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// 將商品圖片轉成 LINE 可以使用的公開網址
function getProductImageUrl(value: unknown): string | null {
  if (!value) return null;

  let raw: unknown = value;

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        raw = parsed[0];
      } else if (
        parsed &&
        typeof parsed === "object" &&
        "url" in parsed
      ) {
        raw = parsed.url;
      }
    } catch {
      // 一般網址或圖片路徑
    }
  }

  if (Array.isArray(raw)) {
    raw = raw[0];
  }

  if (
    raw &&
    typeof raw === "object" &&
    "url" in raw
  ) {
    raw = raw.url;
  }

  if (typeof raw !== "string") return null;

  const clean = raw.trim();
  if (!clean) return null;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://arcapfqiihchltdhysea.supabase.co";

  let imageUrl: string;

  if (
    clean.startsWith("https://") ||
    clean.startsWith("http://")
  ) {
    imageUrl = clean;
  } else {
    imageUrl =
      supabaseUrl.replace(/\/$/, "") +
      "/storage/v1/object/public/product-images/" +
      clean.replace(/^\/+/, "");
  }

  try {
    const url = new URL(imageUrl);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      return null;
