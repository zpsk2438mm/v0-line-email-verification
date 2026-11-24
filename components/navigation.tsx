
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

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
  LogIn,
  LogOut,
  ShoppingBag,
  GraduationCap,
  ShieldCheck,
  Loader2,
  Heart,
} from "lucide-react";

const LOGIN_NEXT_KEY = "login_next";

const ADMIN_LINE_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

const NAV_ITEMS = [
  {
    href: "/",
    label: "販售商品",
    icon: Home,
  },
  {
    href: "/products",
    label: "搜尋市集",
    icon: ShoppingBag,
  },
  {
    href: "/favorites",
    label: "我的最愛",
    icon: Heart,
  },
  {
    href: "/profile",
    label: "個人中心",
    icon: User,
  },
];

export function Navigation() {
  const [open, setOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const {
    userEmail,
    userProfile,
    lineUserId,
    isAuthenticated,
    userName,
    isLiffInit,
    isLoading,
    login,
    logout,
  } = useLiff();

  // 必須完成 LINE + 學校信箱雙重驗證
  const fullyLoggedIn =
    Boolean(lineUserId) &&
    isAuthenticated;

  const isAdmin =
    fullyLoggedIn &&
    Boolean(
      lineUserId &&
      ADMIN_LINE_IDS.includes(lineUserId)
    );

  function requiresLogin(href: string) {
    return (
      href === "/" ||
      href === "/favorites" ||
      href === "/profile"
    );
  }

  // 點擊側邊欄選單
  function handleNavigate(href: string) {
    setOpen(false);

    if (
      !requiresLogin(href) ||
      fullyLoggedIn
    ) {
      router.push(href);
      return;
    }

    if (href === "/") {
      sessionStorage.removeItem(
        LOGIN_NEXT_KEY
      );

      router.push("/");
      return;
    }

    sessionStorage.setItem(
      LOGIN_NEXT_KEY,
      href
    );

    router.push(
      `/?next=${encodeURIComponent(href)}`
    );
  }

  // 登出
  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      setOpen(false);
      await logout();
    } catch (error) {
      console.error(
        "登出失敗:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "登出失敗，請再試一次。"
      );

      setLoggingOut(false);
    }
  }

  // 登入並保留目前所在頁面
  function handleLogin() {
    setOpen(false);

    if (!isLiffInit) {
      alert(
        "LINE 服務尚未初始化，請重新整理後再試。"
      );
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const requested = params.get("next");

    const current =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    let target = current;

    if (
      pathname === "/" &&
      requested &&
      requested.startsWith("/") &&
      !requested.startsWith("//") &&
      !/[\r\n\\]/.test(requested)
    ) {
      target = requested;
    }

    if (target === "/") {
      sessionStorage.removeItem(
        LOGIN_NEXT_KEY
      );
    } else {
      sessionStorage.setItem(
        LOGIN_NEXT_KEY,
        target
      );
    }

    // 已登入 LINE，但還沒完成學校信箱驗證
    if (lineUserId && !isAuthenticated) {
      router.push(
        target === "/"
          ? "/"
          : `/?next=${encodeURIComponent(target)}`
      );
      return;
    }

    // 尚未登入 LINE
    login();
  }

  return (
    <nav>
      <Sheet
        open={open}
        onOpenChange={setOpen}
      >
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-slate-100"
            aria-label="開啟選單"
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="flex w-[300px] flex-col border-r-0 bg-white p-0 shadow-2xl"
        >
          <SheetHeader className="border-b border-slate-100 bg-slate-50 p-6 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D35400] shadow-lg shadow-orange-100">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>

              <SheetTitle className="text-xl font-black tracking-tight text-slate-800">
                南台二手交易
              </SheetTitle>
            </div>
          </SheetHeader>

          {/* 已完成雙重驗證才顯示個人資料 */}
          {fullyLoggedIn ? (
            <div className="px-4 py-4">
              <div className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-white">
                  {userProfile?.pictureUrl ? (
                    <img
                      src={userProfile.pictureUrl}
                      alt="使用者頭像"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-orange-50 text-[#D35400]">
                      <User size={20} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black text-slate-800">
                    {userProfile?.displayName ||
                      userName ||
                      "南臺同學"}
                  </p>

                  <p className="truncate text-[10px] font-medium tracking-tighter text-slate-400">
                    {userEmail ||
                      "已連結 LINE 帳號"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#D35400]">
                  <User className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">
                    {isLoading
                      ? "登入狀態確認中"
                      : "訪客模式"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {lineUserId && !isAuthenticated
                      ? "請完成學校信箱驗證"
                      : "登入後即可使用完整功能"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 側邊欄選單 */}
          <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-2 text-left">
            <ul className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                const active =
                  pathname === item.href ||
                  (
                    item.href === "/products" &&
                    pathname.startsWith("/products/")
                  );

                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        handleNavigate(item.href)
                      }
                      className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-left text-sm font-bold transition-all ${
                        active
                          ? "bg-[#D35400] text-white shadow-md shadow-orange-100"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          active
                            ? "text-white"
                            : item.href === "/favorites"
                              ? "text-rose-500"
                              : "text-slate-400"
                        }`}
                      />

                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* 管理員後台 */}
            {isAdmin && (
              <div className="border-t border-dashed border-slate-200 pt-4">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-black transition-all ${
                    pathname === "/admin"
                      ? "bg-amber-500 text-white shadow-lg"
                      : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                  管理員後台
                </Link>
              </div>
            )}
          </nav>

          {/* 登入 / 登出切換 */}
          <div className="mt-auto border-t bg-slate-50 p-6">
            {isLoading ? (
              <Button
                disabled
                variant="outline"
                className="h-11 w-full rounded-xl"
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                確認登入狀態...
              </Button>
            ) : fullyLoggedIn ? (
              <Button
                variant="outline"
                disabled={loggingOut}
                className="h-11 w-full rounded-xl border-slate-200 font-bold text-slate-600 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => {
                  void handleLogout();
                }}
              >
                {loggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}

                {loggingOut
                  ? "正在登出..."
                  : "登出"}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-[#D35400] font-bold text-white hover:bg-[#B84600]"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" />
                登入
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
