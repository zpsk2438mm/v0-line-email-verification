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
import { Separator } from "@/components/ui/separator";
import { useLiff } from "@/components/liff-provider";
import {
  Menu,
  Home,
  User,
  Package,
  LogOut,
  ShoppingBag,
  GraduationCap,
  ShieldCheck, // 👈 引入管理員圖標
} from "lucide-react";

// 管理員名單
const ADMIN_LINE_IDS = ["Ued7dfd77b63273d497cebc62f1a7b1df"];

const NAV_ITEMS = [
  { href: "/", label: "刊登商品", icon: Home },
  { href: "/products", label: "市集瀏覽", icon: ShoppingBag },
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/my-listings", label: "我的商品", icon: Package },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userEmail, userProfile, lineUserId, closeWindow } = useLiff();

  // 判斷是否為管理員
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
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="開啟選單"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <SheetTitle className="text-left">南台二手物平台</SheetTitle>
          </div>
        </SheetHeader>

        {/* 用戶資訊區塊 */}
        {(userEmail || userProfile) && (
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden border border-slate-100">
                {userProfile?.pictureUrl ? (
                  <img 
                    src={userProfile.pictureUrl} 
                    alt="Avatar" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {userProfile?.displayName || "已驗證用戶"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate font-medium">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* 👈 補回管理員按鈕：只有符合 ID 才會顯示 */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-dashed border-border">
              <Link href="/admin" onClick={() => setOpen(false)}>
                <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                  pathname === "/admin" 
                    ? "bg-amber-500 text-white" 
                    : "text-amber-600 hover:bg-amber-50 bg-amber-50/50"
                }`}>
                  <ShieldCheck className="h-5 w-5" />
                  管理員後台
                </div>
              </Link>
            </div>
          )}
        </nav>

        <Separator />

        {/* Footer Actions */}
        <div className="p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-lg"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
          
          {lineUserId && (
            <p className="text-[10px] text-muted-foreground/30 text-center pt-2 font-mono">
              ID: {lineUserId.substring(0, 12)}...
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
