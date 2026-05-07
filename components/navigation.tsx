"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiff } from "@/components/liff-provider";
import { Menu, Home, User, Package, ShoppingBag, GraduationCap } from "lucide-react";

export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 關鍵：從這裡拿到 userProfile
  const { userProfile, userEmail } = useLiff();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <SheetTitle className="text-left text-base">南台二手物平台</SheetTitle>
          </div>
        </SheetHeader>

        {/* 用戶資訊區塊 */}
        <div className="border-b p-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border bg-white flex items-center justify-center shrink-0">
              {userProfile?.pictureUrl ? (
                <img src={userProfile.pictureUrl} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {userProfile?.displayName || "未登入"}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-medium">
                {userEmail || "請完成驗證"}
              </p>
            </div>
          </div>
        </div>

        {/* 選單連結 */}
        <nav className="p-4 space-y-1">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-slate-100 rounded-lg">
            <Home className="h-5 w-5" /> 刊登商品
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-slate-100 rounded-lg">
            <User className="h-5 w-5" /> 個人中心
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
