"use client";

import React from "react";
import { useLiff } from "@/components/liff-provider";
import { User, Home, Package, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function Navigation() {
  const { userProfile, isAuthenticated } = useLiff();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <div className="flex flex-col h-full bg-white">
          {/* 你原始提供的資訊區塊樣式 */}
          <div className="flex items-center gap-3 px-4 py-6 border-b bg-slate-50/50">
            <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white shrink-0 flex items-center justify-center">
              {userProfile?.pictureUrl ? (
                <img 
                  src={userProfile.pictureUrl} 
                  alt="Avatar" 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="h-6 w-6 text-slate-300" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {userProfile?.displayName || "未登入"}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-medium">
                {userProfile?.email || "請完成驗證"}
              </p>
            </div>
          </div>

          {/* 選單部分 */}
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">回首頁</span>
            </Link>
            <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg transition-colors">
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">個人中心</span>
            </Link>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
