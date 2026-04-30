import { ListingForm } from "@/components/listing-form";
import { ShoppingBag } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <ShoppingBag className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight text-foreground">
            上架您的二手寶物
          </h1>
          <p className="text-xs text-muted-foreground">
            填寫資料後送出，等待審核上架
          </p>
        </div>
      </header>

      {/* Form card */}
      <div className="mx-auto max-w-lg">
        <div className="m-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ListingForm />
        </div>
      </div>
    </main>
  );
}
