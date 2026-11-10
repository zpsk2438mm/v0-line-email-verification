import { RequireVerification } from "@/components/require-verification";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RequireVerification>{children}</RequireVerification>;
}
