
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  LogIn,
  ShoppingBag,
  GraduationCap,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

const NAV_ITEMS = [
  { href: "/", label: "販售商品", icon: Home },
  { href: "/products", label: "搜尋市集", icon: ShoppingBag },
  { href: "/profile", label: "個人中心", icon: User },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const pathname = usePathname();
  const router = useRouter();

  const {
    userEmail,
    userProfile,
    lineUserId,
    isAuthenticated,
    userName,
    isLiffInit,
    login,
    logout,
  } = useLiff();

  const isAdmin =
    Boolean(lineUserId) &&
    ADMIN_LINE_IDS.includes(lineUserId!);

  const hasSession =
    Boolean(isAuthenticated) || Boolean(lineUserId);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setOpen(false);
    } catch (err) {
      console.error("登出失敗:", err);
      setLogoutError(
        err instanceof Error
          ? err.message
          : "登出失敗，請稍後再試。"
      );
      setLoggingOut(false);
    }
  };

  const handleLogin = () => {
    setOpen(false);
    setLogoutError("");

    // 首頁已有 LINE 登入與學校信箱驗證畫面
    if (pathname !== "/") {
      router.push("/");
      return;
    }

    // 已有 LINE 身分但學校信箱尚未驗證時，
    // 首頁會直接顯示信箱驗證畫面
    if (!lineUserId) {
      login();
    }
  };

  return (
    <nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-slate-100"
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-[300px] p-0 flex flex-col border-r-0 shadow-2xl bg-white"
        >
          <SheetHeader className="p-6 bg-slate-50 text-left border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-lg shadow-orange-100">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>

              <SheetTitle className="text-xl font-black text-slate-800 tracking-tight">
                南台二手交易
              </SheetTitle>
            </div>
          </SheetHeader>

          {isAuthenticated && (
            <div className="px-4 py-4">
              <div className="bg-slate-50/80 rounded-2xl p-4 flex items-center gap-3 border border-slate-100 shadow-sm min-h-[82px]">
                {!isLiffInit ? (
                  <div className="flex items-center gap-3 w-full justify-center py-1">
                    <Loader2 className="h-4 w-4 animate-spin text-[#D35400]" />
                    <span className="text-xs text-slate-400 font-medium">
                      LINE 資料同步中...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 shrink-0 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-white">
                      {userProfile?.pictureUrl ? (
                        <img
                          src={userProfile.pictureUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-orange-50 text-[#D35400]">
                          <User size={20} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-black truncate text-slate-800">
                        {userProfile?.displayName ||
                          userName ||
                          "南臺同學"}
                      </p>

                      <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-tighter">
                        {userEmail || "已連結 LINE 帳號"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
                          ? "bg-[#D35400] text-white shadow-md shadow-orange-100"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          isActive
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <div className="pt-4 border-t border-dashed border-slate-200">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                >
                  <div
                    className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black transition-all ${
                      pathname === "/admin"
                        ? "bg-amber-500 text-white shadow-lg"
                        : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    管理員後台
                  </div>
                </Link>
              </div>
            )}
          </nav>

          <div className="p-6 bg-slate-50 border-t mt-auto space-y-3">
            {logoutError && (
              <p
                role="alert"
                className="text-xs text-red-600 font-medium"
              >
                {logoutError}
              </p>
            )}

            {hasSession ? (
              <Button
                variant="outline"
                disabled={loggingOut}
                className="w-full h-11 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
                onClick={handleLogout}
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    正在登出...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登入
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="w-full h-11 rounded-xl font-bold bg-[#D35400] hover:bg-[#B84600] text-white"
                onClick={handleLogin}
              >
                <LogIn className="h-4 w-4 mr-2" />
                登入帳號
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
