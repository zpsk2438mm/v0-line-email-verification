"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { Loader2 } from "lucide-react";

export function RequireVerification({ children }: { children: ReactNode }) {
  const { isLoading, lineUserId, isAuthenticated } = useLiff();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = !!lineUserId && isAuthenticated;
  useEffect(() => {
    if (!isLoading && !allowed) {
      const target = window.location.pathname + window.location.search;
      router.replace(`/?next=${encodeURIComponent(target)}`);
    }
  }, [isLoading, allowed, pathname, router]);
  if (isLoading || !allowed) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-600" /></div>;
  }
  return <>{children}</>;
}
