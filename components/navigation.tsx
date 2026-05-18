"use client";

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef } from "react";
import { LayoutGrid, ShoppingBag, UserCircle, PlusCircle, Search, Menu, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 🎯 導航項目定義 (✨ 這裡已移除「我的商品」)
const NAV_ITEMS = [
  { href: "/", label: "市集首頁", icon: ShoppingBag },
  { href: "/products/new", label: "刊登商品", icon: PlusCircle },
  { href: "/profile", label: "個人中心", icon: UserCircle },
  // { href: "/my-listings", label: "我的商品", icon: Package }, // ❌ 已移除，移至個人中心按鈕
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-gray-600 hover:bg-orange-50 active:scale-95 transition-transform">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-white rounded-r-3xl p-0 border-none shadow-2xl flex flex-col">
        <SheetHeader className="p-6 border-b border-gray-100">
          <SheetTitle className="text-xl font-black text-gray-900 flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-md">
                 <ShoppingBag className="h-5 w-5 text-white" />
             </div>
             南台二手市集
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 p-3 space-y-2 mt-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                onClick={() => setOpen(false)} // 點擊後關閉側邊欄
                className={`w-full justify-start gap-4 h-14 rounded-xl text-lg font-bold px-4 transition-colors ${
                  isActive 
                    ? "bg-[#D35400] text-white hover:bg-[#D35400] hover:text-white" 
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <Link href={item.href}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="p-4 mt-auto border-t border-gray-100">
            <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-wider">stust campus market</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
