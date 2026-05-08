"use client";

import { useLiff } from "@/components/liff-provider";
import { Navigation } from "@/components/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Package, Mail, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { userProfile, userEmail, isAuthenticated, login } = useLiff();

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 text-center space-y-4 shadow-xl rounded-3xl">
          <User className="h-12 w-12 mx-auto text-slate-300" />
          <h2 className="font-bold text-xl">請先登入</h2>
          <Button onClick={() => login?.()} className="w-full bg-blue-600 h-12 rounded-xl font-bold text-white">使用 LINE 登入</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold">個人中心</h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 用戶資訊卡 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-8">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><User size={32} /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">{userProfile?.displayName || "南台用戶"}</h2>
                <div className="flex items-center gap-1 text-blue-100 opacity-90 mt-1">
                  <Mail className="h-3 w-3" />
                  <p className="text-xs font-medium truncate">{userEmail || "驗證收件中..."}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 快捷功能區塊 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/">
            <Button className="w-full h-24 bg-white border-none shadow-sm rounded-3xl flex flex-col gap-2 text-slate-600 hover:bg-blue-50 transition-all">
              <Plus className="h-6 w-6 text-blue-600" />
              <span className="font-bold">我要上架</span>
            </Button>
          </Link>
          <Link href="/my-listings">
            <Button className="w-full h-24 bg-white border-none shadow-sm rounded-3xl flex flex-col gap-2 text-slate-600 hover:bg-blue-50 transition-all">
              <Package className="h-6 w-6 text-blue-600" />
              <span className="font-bold">管理商品</span>
            </Button>
          </Link>
        </div>

        {/* 其他設定 (範例) */}
        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <div className="p-2">
                <Link href="/my-listings" className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Package size={20}/></div>
                        <span className="font-bold text-slate-700">查看我的刊登記錄</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                </Link>
            </div>
        </Card>
      </div>
    </main>
  );
}
