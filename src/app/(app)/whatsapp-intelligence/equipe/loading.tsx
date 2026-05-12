function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ''}`} />
}

function MemberCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-3 flex items-center gap-3">
        <ShimmerBlock className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <ShimmerBlock className="mb-2 h-4 w-32" />
          <ShimmerBlock className="h-3 w-44" />
        </div>
      </div>
      <ShimmerBlock className="mb-2 h-3 w-full" />
      <ShimmerBlock className="h-3 w-2/3" />
    </div>
  )
}

export default function EquipeLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ShimmerBlock className="h-9 w-48 rounded-lg" />
        <ShimmerBlock className="h-9 w-36 rounded-lg" />
      </div>

      {/* Grid de membros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
