function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ''}`} />
}

export default function OperacaoLoading() {
  return (
    <div aria-busy="true">
      {/* Hero banner */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card-modern">
        <ShimmerBlock className="mb-3 h-4 w-32" />
        <ShimmerBlock className="mb-2 h-10 w-64" />
        <ShimmerBlock className="h-4 w-80" />
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
            <ShimmerBlock className="mb-3 h-4 w-28" />
            <ShimmerBlock className="mb-2 h-8 w-24" />
            <ShimmerBlock className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Tabela de leads esfriando */}
      <div className="rounded-xl border border-border bg-card shadow-card-modern">
        <div className="border-b border-border p-4">
          <ShimmerBlock className="h-5 w-48" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3">
            <ShimmerBlock className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="flex-1">
              <ShimmerBlock className="mb-2 h-4 w-40" />
              <ShimmerBlock className="h-3 w-56" />
            </div>
            <ShimmerBlock className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
