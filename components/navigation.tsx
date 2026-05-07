"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiff } from "@/components/liff-provider";
import { Menu, Home, User, Package, ShoppingBag, ShieldCheck } from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

// 修正回原本的功能按鈕，但換成漂亮的圖示
const NAV_ITEMS = [
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/products", label: "市集瀏覽", icon: ShoppingBag },
  { href: "/", label: "刊登商品", icon: Home },
  { href: "/my-listings", label: "我的商品", icon: Package },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userProfile, lineUserId, closeWindow } = useLiff();
  const isAdmin = lineUserId && ADMIN_LINE_IDS.includes(lineUserId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-orange-50 rounded-full transition-colors">
          <Menu className="h-6 w-6 text-gray-700" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 border-none bg-white">
        <div className="flex flex-col h-full">
          {/* 上方導覽項目 - 恢復原本的功能 */}
          <nav className="flex-1 px-2 py-8">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-4 px-6 py-4 text-base font-bold transition-all ${
                        isActive ? "text-[#D95300] bg-orange-50/50" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-[#D95300]" : "text-gray-400"}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                <Link 
                  href="/admin" 
                  onClick={() => setOpen(false)} 
                  className="flex items-center gap-4 px-6 py-4 text-amber-600 font-bold hover:bg-amber-50"
                >
                  <ShieldCheck className="h-5 w-5" />
                  管理員後台
                </Link>
              </div>
            )}
          </nav>

          {/* 下方按鈕區 */}
          <div className="p-6 mt-auto">
            <Button 
              className="w-full h-14 bg-[#D95300] hover:bg-[#B84600] text-white text-lg font-black rounded-2xl shadow-lg shadow-orange-200 transition-transform active:scale-95"
              onClick={() => closeWindow()}
            >
              登入 / 退出
            </Button>
            {lineUserId && (
              <p className="mt-4 text-[10px] text-center font-mono text-gray-300 uppercase tracking-widest">
                UID: {lineUserId.substring(0, 12)}...
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
