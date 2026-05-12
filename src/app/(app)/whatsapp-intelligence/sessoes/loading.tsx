function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ''}`} />
}

export default function SessoesLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ShimmerBlock className="h-9 w-56 rounded-lg" />
        <ShimmerBlock className="h-9 w-36 rounded-lg" />
      </div>

      {/* Lista de sessões */}
      <div className="rounded-xl border border-border bg-card shadow-card-modern">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
          >
            <ShimmerBlock className="h-12 w-12 flex-shrink-0 rounded-full" />
            <div className="flex-1">
              <ShimmerBlock className="mb-2 h-4 w-48" />
              <ShimmerBlock className="h-3 w-72" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <ShimmerBlock className="h-4 w-20" />
              <ShimmerBlock className="h-3 w-16" />
            </div>
            <ShimmerBlock className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
