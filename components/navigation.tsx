"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiff } from "@/components/liff-provider";
import { Menu, Home, User, Package, LogOut, ShoppingBag, ShieldCheck, Info } from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

const NAV_ITEMS = [
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/products", label: "所有商品", icon: ShoppingBag },
  { href: "/", label: "刊登商品", icon: Home },
  { href: "/about", label: "關於我們", icon: Info },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userProfile, lineUserId, closeWindow } = useLiff();
  const isAdmin = lineUserId && ADMIN_LINE_IDS.includes(lineUserId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-6 w-6 text-gray-700" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 border-none bg-white">
        <div className="flex flex-col h-full">
          {/* 上方導覽項目 */}
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
                      className={`flex items-center gap-4 px-6 py-4 text-base font-medium transition-colors ${
                        isActive ? "text-[#D95300]" : "text-gray-600 hover:bg-gray-50"
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
              <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-4 px-6 py-4 text-amber-600">
                <ShieldCheck className="h-5 w-5" />管理員後台
              </Link>
            )}
          </nav>

          {/* 下方登入/登出按鈕區 */}
          <div className="p-6 space-y-4">
            <Button 
              className="w-full h-14 bg-[#D95300] hover:bg-[#B84600] text-white text-lg font-bold rounded-xl shadow-lg shadow-orange-100"
              onClick={() => !userProfile ? null : closeWindow()}
            >
              {userProfile ? "退出" : "登入"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
