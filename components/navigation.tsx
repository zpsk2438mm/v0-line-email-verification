"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiff } from "@/components/liff-provider";
import {
  Menu,
  Home,
  User,
  Package,
  LogOut,
  ShoppingBag,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df", "Uf7c4668bc96315297b02b0a67fff88ea"];

const NAV_ITEMS = [
  { href: "/", label: "刊登商品", icon: Home },
  { href: "/products", label: "市集瀏覽", icon: ShoppingBag },
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/my-listings", label: "我的商品", icon: Package }, // 修正：指向獨立的商品管理頁面
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userEmail, userProfile, lineUserId, closeWindow, isAuthenticated } = useLiff();
  const isAdmin = lineUserId && ADMIN_LINE_IDS.includes(lineUserId);

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("stust_authenticated");
    closeWindow();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10">
          <Menu className="h-6 w-6 text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col border-r-0 shadow-2xl bg-white">
        <SheetHeader className="p-6 bg-primary/5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <SheetTitle className="text-xl font-black text-primary text-left">南台二手交易</SheetTitle>
          </div>
        </SheetHeader>

        {isAuthenticated && (
          <div className="px-4 py-4 text-left">
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
              <div className="h-12 w-12 shrink-0 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-white text-slate-300">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary"><User /></div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold truncate text-slate-800">{userProfile?.displayName || "載入中..."}</p>
                <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-2 space-y-6 text-left">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                      isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            <div className="pt-4 border-t border-dashed text-left">
              <Link href="/admin" onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition-all ${
                  pathname === "/admin" ? "bg-amber-500 text-white shadow-lg" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                }`}>
                  <ShieldCheck className="h-5 w-5" />
                  管理員後台
                </div>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-6 bg-slate-50/50 mt-auto border-t space-y-3 text-left">
          <Button variant="outline" className="w-full h-11 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> 退出登錄
          </Button>
          {lineUserId && (
            <p className="text-[9px] text-center font-mono text-slate-300 uppercase tracking-widest">UID: {lineUserId.substring(0, 16)}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
