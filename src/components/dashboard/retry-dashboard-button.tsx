"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RetryDashboardButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => router.refresh()}
      className="h-10 rounded-lg border border-border bg-card px-4 text-sm hover:bg-background focus-visible:ring-primary"
    >
      Tentar novamente
    </Button>
  );
}
