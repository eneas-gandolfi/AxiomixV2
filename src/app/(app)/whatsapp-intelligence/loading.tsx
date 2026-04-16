function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

export default function WhatsAppIntelligenceLoading() {
  return (
    <div aria-busy="true">
      {/* Acoes rapidas */}
      <div className="mb-6 flex justify-end gap-2">
        <ShimmerBlock className="h-9 w-32 rounded-lg" />
        <ShimmerBlock className="h-9 w-40 rounded-lg" />
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
            <ShimmerBlock className="mb-3 h-4 w-24" />
            <ShimmerBlock className="mb-2 h-8 w-20" />
            <ShimmerBlock className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex h-[280px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
          <ShimmerBlock className="mb-4 h-5 w-48" />
          <ShimmerBlock className="min-h-0 flex-1 rounded-lg" />
        </div>
        <div className="flex h-[280px] flex-col rounded-xl border border-border bg-card p-4 shadow-card-modern">
          <ShimmerBlock className="mb-4 h-5 w-48" />
          <ShimmerBlock className="min-h-0 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
