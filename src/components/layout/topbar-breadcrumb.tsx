"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBreadcrumb } from "@/lib/breadcrumb";

export function TopbarBreadcrumb() {
  const pathname = usePathname();
  const segments = getBreadcrumb(pathname);
  const shouldHideBreadcrumb = segments.length <= 1;

  if (shouldHideBreadcrumb) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={`${segment}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight
                size={12}
                className="text-[var(--color-muted-light)]"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={
                isLast
                  ? "text-sm font-medium text-[var(--color-text)]"
                  : "text-sm text-[var(--color-muted)]"
              }
            >
              {segment}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
