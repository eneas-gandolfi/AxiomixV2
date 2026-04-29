/**
 * Arquivo: src/components/dashboard/dashboard-skeleton.tsx
 * Propósito: Skeleton de loading do dashboard com layout bento grid
 * Autor: AXIOMIX
 * Data: 2026-03-19
 */

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`scan-loader rounded ${className ?? ""}`} />;
}

function MetricCardSkeleton({ isHero }: { isHero?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-card-modern ${
        isHero ? "sm:col-span-2 xl:row-span-2" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <ShimmerBlock className={isHero ? "h-3 w-24" : "h-4 w-20"} />
        <ShimmerBlock className={isHero ? "h-10 w-10 rounded-lg" : "h-8 w-8 rounded-lg"} />
      </div>
      <ShimmerBlock className={isHero ? "mb-3 h-12 w-32" : "mb-2 h-7 w-24"} />
      <ShimmerBlock className="mb-2 h-3 w-16" />
      {isHero && <ShimmerBlock className="mt-2 h-[48px] w-full rounded-lg" />}
      <ShimmerBlock className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton({ height = "h-[280px]" }: { height?: string }) {
  return (
    <div className={`flex flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern ${height}`}>
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
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-3 flex items-center gap-2">
        <ShimmerBlock className="h-7 w-7 rounded-full" />
        <ShimmerBlock className="h-5 w-40" />
      </div>
      <ShimmerBlock className="h-16 w-full rounded-lg" />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="dashboard-mesh overflow-hidden rounded-[28px] border border-border/70 p-5 sm:p-6 lg:p-7">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,340px)]">
        <div className="flex flex-col gap-5">
          <ShimmerBlock className="h-8 w-40 rounded-full" />
          <ShimmerBlock className="h-10 w-72" />
          <ShimmerBlock className="h-4 w-full max-w-2xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            <ShimmerBlock className="h-24 w-full rounded-2xl" />
            <ShimmerBlock className="h-24 w-full rounded-2xl" />
            <ShimmerBlock className="h-24 w-full rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <ShimmerBlock className="h-11 w-36 rounded-lg" />
            <ShimmerBlock className="h-11 w-40 rounded-lg" />
          </div>
        </div>
        <div className="dashboard-panel rounded-[24px] p-5">
          <ShimmerBlock className="h-6 w-32 rounded-full" />
          <ShimmerBlock className="mt-4 h-7 w-48" />
          <ShimmerBlock className="mt-3 h-16 w-full" />
          <div className="mt-5 space-y-3">
            <ShimmerBlock className="h-16 w-full rounded-2xl" />
            <ShimmerBlock className="h-16 w-full rounded-2xl" />
            <ShimmerBlock className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8" aria-busy="true">
      <HeaderSkeleton />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="opacity-0 animate-ax-cascade" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "forwards" }}>
                <MetricCardSkeleton />
              </div>
            ))}
          </section>

          <ChartSkeleton />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChartSkeleton height="h-[260px]" />
            <ChartSkeleton height="h-[260px]" />
          </section>

          <ChartSkeleton height="h-[220px]" />
        </div>

        <aside className="space-y-4">
          <AlertsSkeleton />
          <ChartSkeleton height="h-[200px]" />
          <ChartSkeleton height="h-[240px]" />
          <ChartSkeleton height="h-[260px]" />
        </aside>
      </section>
    </main>
  );
}
