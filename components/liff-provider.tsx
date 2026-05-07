"use client";

import { useLiff } from "@/components/liff-provider";
import { User } from "lucide-react";

export function Navigation() {
  const { userProfile, userEmail } = useLiff();

  return (
    <div className="flex items-center gap-3 p-4">
      {/* 顯示頭像 */}
      <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200">
        {userProfile?.pictureUrl ? (
          <img 
            src={userProfile.pictureUrl} 
            alt="Avatar" 
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer" // 👈 這行一定要加，圖片才不會破圖
          />
        ) : (
          <User className="h-full w-full p-2 text-slate-400" />
        )}
      </div>

      {/* 顯示暱稱與信箱 */}
      <div className="flex flex-col">
        <span className="text-sm font-bold">
          {userProfile?.displayName || "南台用戶"}
        </span>
        <span className="text-[10px] text-slate-500">{userEmail}</span>
      </div>
    </div>
  );
}
