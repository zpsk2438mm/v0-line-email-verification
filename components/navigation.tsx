"use client";

import React from "react";
import { useLiff } from "@/components/liff-provider"; // 1. 確保路徑正確
import { User, Home, Package, PlusCircle, LogIn } from "lucide-react";
import Link from "next/link";

// 這裡假設你使用的是 Sheet 或類似的側邊欄組件
export function Navigation() {
  // 2. 必須在組件內部宣告這行
  const { userProfile, isAuthenticated, login } = useLiff();

  return (
    <nav>
      {/* --- 用戶資訊區塊 --- */}
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
            {userProfile?.displayName || (isAuthenticated ? "載入中..." : "未登入")}
          </p>
          <p className="text-[10px] text-slate-500 truncate font-medium">
            {userProfile?.email || (isAuthenticated ? "" : "請點擊登入")}
          </p>
        </div>
      </div>

      {/* --- 選單列表 --- */}
      <div className="flex flex-col gap-1 p-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100">
          <Home className="h-5 w-5" />
          <span className="text-sm">首頁</span>
        </Link>
        
        {/* 如果未登入顯示登入按鈕，已登入顯示個人中心 */}
        {isAuthenticated ? (
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100">
            <User className="h-5 w-5" />
            <span className="text-sm">個人中心</span>
          </Link>
        ) : (
          <button onClick={() => login?.()} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 w-full text-left">
            <LogIn className="h-5 w-5" />
            <span className="text-sm">登入帳號</span>
          </button>
        )}
      </div>
    </nav>
  );
}
