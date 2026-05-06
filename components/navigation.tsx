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
  ShoppingBag, // 👈 引入市集小包包圖標
  GraduationCap,
} from "lucide-react";

// 💡 秘訣：在這裡直接把「市集瀏覽」加入選單清單中！
const NAV_ITEMS = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/products", label: "市集瀏覽", icon: ShoppingBag }, // 👈 新增這一行！
  { href: "/profile", label: "個人中心", icon: User },
  { href: "/my-listings", label: "我的商品", icon: Package },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userEmail, lineUserId, closeWindow } = useLiff();

  const handleLogout = () => {
    // Clear local storage auth
    if (typeof window !== "undefined") {
      localStorage.removeItem("stust_authenticated");
    }
    // Close LIFF window or reload
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
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <SheetTitle className="text-left">南台二手物平台</SheetTitle>
          </div>
        </SheetHeader>

        {/* User Info Section */}
        {userEmail && (
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  已驗證用戶
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-4">
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
        </nav>

        <Separator />

        {/* Footer Actions */}
        <div className="p-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
          
          {/* Debug info */}
          {lineUserId && (
            <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
              ID: {lineUserId.substring(0, 6)}...
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
