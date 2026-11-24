
import type { ReactNode } from "react";
import { RequireVerification } from "@/components/require-verification";

export default function KeywordAlertsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireVerification>
      {children}
    </RequireVerification>
  );
}
