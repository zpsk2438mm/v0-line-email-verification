"use client";

import { ListingForm } from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import { ShoppingBag } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F9F8F6]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        {/* ✅ 圖標背景改為橘色 */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D95300]">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold">南台二手物上架</h1>
      </header>
      <div className="mx-auto max-w-lg px-4 py-6">
        <ListingForm />
      </div>
    </main>
  );
}
