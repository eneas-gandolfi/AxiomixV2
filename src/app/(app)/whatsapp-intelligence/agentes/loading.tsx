function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card-modern">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-8 w-8 rounded-lg" />
          <div>
            <ShimmerBlock className="mb-1.5 h-4 w-28" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
        </div>
        <ShimmerBlock className="h-5 w-12 rounded-full" />
      </div>
      <ShimmerBlock className="mb-2 h-3 w-full" />
      <ShimmerBlock className="mb-4 h-3 w-3/4" />
      <div className="flex items-center justify-between border-t border-border pt-3">
        <ShimmerBlock className="h-7 w-24 rounded-md" />
        <ShimmerBlock className="h-7 w-7 rounded-md" />
      </div>
    </div>
  );
}

export default function AgentesLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-5 w-5 rounded" />
          <ShimmerBlock className="h-5 w-28" />
          <ShimmerBlock className="h-5 w-7 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-9 w-9 rounded-lg" />
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-3">
        <ShimmerBlock className="h-7 w-24 rounded-full" />
        <ShimmerBlock className="h-7 w-24 rounded-full" />
        <ShimmerBlock className="h-7 w-32 rounded-full" />
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
