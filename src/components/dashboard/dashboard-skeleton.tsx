/**
 * Arquivo: src/components/dashboard/dashboard-skeleton.tsx
 * Propósito: Skeleton de loading do dashboard redesenhado
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-sm">
      <div className="mb-3 flex items-start justify-between">
        <ShimmerBlock className="h-4 w-20" />
        <ShimmerBlock className="h-8 w-8 rounded-lg" />
      </div>
      <ShimmerBlock className="mb-2 h-7 w-24" />
      <ShimmerBlock className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton({ height = "h-[280px]" }: { height?: string }) {
  return (
    <div className={`flex flex-col rounded-xl border border-border bg-card p-4 shadow-card-sm ${height}`}>
      <div className="mb-1 flex items-center gap-2">
        <ShimmerBlock className="h-4 w-4 rounded" />
        <ShimmerBlock className="h-4 w-40" />
      </div>
      <ShimmerBlock className="mb-4 h-3 w-24" />
      <ShimmerBlock className="min-h-0 flex-1 rounded-lg" />
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShimmerBlock className="h-7 w-7 rounded-full" />
        <ShimmerBlock className="h-5 w-40" />
      </div>
      <ShimmerBlock className="h-16 w-full rounded-lg" />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-sm">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBlock className="h-4 w-44" />
        <ShimmerBlock className="h-5 w-20 rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <ShimmerBlock className="h-5 w-5 rounded-full" />
            <ShimmerBlock className="h-2.5 flex-1 rounded-full" />
            <ShimmerBlock className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 md:p-8" aria-busy="true">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <ShimmerBlock className="h-7 w-40" />
          <ShimmerBlock className="h-4 w-72" />
        </div>
      </header>

      {/* Alerts placeholder */}
      <AlertsSkeleton />

      {/* 4 Metric Cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </section>

      {/* Sentiment Trend Chart (full width) */}
      <ChartSkeleton />

      {/* Content Performance + Competitive Intelligence */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartSkeleton height="h-[260px]" />
        <ChartSkeleton height="h-[260px]" />
      </section>

      {/* Sentiment Overview */}
      <OverviewSkeleton />
    </main>
  );
}
