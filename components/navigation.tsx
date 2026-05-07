"use client";

import { useLiff } from "@/components/liff-provider";
import { User, Home, Package } from "lucide-react";
import Link from "next/link";

export function Navigation() {
  // 關鍵：從 Provider 抓取 userProfile
  const { userProfile, isAuthenticated } = useLiff();

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* 使用者資訊區塊：同步 LINE 名稱與頭貼 */}
      <div className="flex items-center gap-3 px-4 py-6 border-b bg-slate-50/50">
        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white shrink-0">
          {userProfile?.pictureUrl ? (
            <img 
              src={userProfile.pictureUrl} 
              alt="User" 
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-100">
              <User className="h-6 w-6 text-slate-300" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          {/* 這裡會顯示「椅子 🪑」而非「已驗證用戶」 */}
          <p className="text-sm font-bold text-slate-900 truncate">
            {userProfile?.displayName || (isAuthenticated ? "載入中..." : "未登入")}
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            {userProfile?.email || "STUST User"}
          </p>
        </div>
      </div>

      {/* 導覽選單 */}
      <nav className="p-2 space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors">
          <Home className="h-5 w-5 text-slate-500" /> 首頁
        </Link>
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors text-blue-600 bg-blue-50">
          <User className="h-5 w-5" /> 個人中心
        </Link>
      </nav>
    </div>
  );
}
