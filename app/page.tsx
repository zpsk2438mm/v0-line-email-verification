"use client";

import { ListingForm } from "@/components/listing-form";
import { Navigation } from "@/components/navigation";
import { ShoppingBag } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F9F8F6]">
      {/* 頂部 Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-[#D95300] p-1.5 rounded-lg shadow-sm">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">南臺二手交易平臺</h1>
        </div>
        <Navigation />
      </header>

      {/* 刊登表單區域 */}
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-orange-900/5 overflow-hidden">
          <ListingForm />
        </div>
      </div>
    </main>
  );
}
