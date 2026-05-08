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

// 導航鏈結
const NAV_ITEMS = [
  { href: "/", label: "刊登商品", icon: Home },
  { href: "/products", label: "市集瀏覽", icon: ShoppingBag },
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/my-listings", label: "我的商品", icon: Package }, // 確保路徑正確
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userEmail, userProfile, lineUserId, closeWindow, isAuthenticated } = useLiff();
  const isAdmin = lineUserId && ADMIN_LINE_IDS.includes(lineUserId);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("stust_authenticated");
    }
    closeWindow();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
          <Menu className="h-6 w-6 text-slate-700" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col border-r-0 shadow-2xl bg-white">
        {/* 標題區 */}
        <SheetHeader className="p-6 bg-slate-50 text-left border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <SheetTitle className="text-xl font-black text-slate-800 tracking-tight">南台二手交易</SheetTitle>
          </div>
        </SheetHeader>

        {/* --- 找回來的驗證資訊區塊 --- */}
        {isAuthenticated && (
          <div className="px-4 py-4">
            <div className="bg-slate-50/80 rounded-2xl p-4 flex items-center gap-3 border border-slate-100 shadow-sm">
              <div className="h-12 w-12 shrink-0 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-white">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Avatar" 
                    className="h-full w-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-600">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-black truncate text-slate-800">
                  {userProfile?.displayName || "載入中..."}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tighter">
                  {userEmail || "已連結 LINE 帳號"}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* ------------------------- */}

        <nav className="flex-1 px-4 py-2 space-y-8 text-left overflow-y-auto">
          <ul className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-100" 
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            <div className="pt-4 border-t border-dashed border-slate-200">
              <Link href="/admin" onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black transition-all ${
                  pathname === "/admin" ? "bg-amber-500 text-white shadow-lg" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                }`}>
                  <ShieldCheck className="h-5 w-5" />
                  管理員後台
                </div>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-6 bg-slate-50 border-t mt-auto">
          <Button 
            variant="outline" 
            className="w-full h-11 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> 退出登錄
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
