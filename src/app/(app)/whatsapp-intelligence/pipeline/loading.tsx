function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ''}`} />
}

function KanbanCardSkeleton() {
  return (
    <div className="mb-2 rounded-lg border border-border bg-surface p-3">
      <ShimmerBlock className="mb-2 h-4 w-32" />
      <ShimmerBlock className="mb-2 h-3 w-44" />
      <ShimmerBlock className="h-3 w-20" />
    </div>
  )
}

function KanbanColumnSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex w-[280px] flex-shrink-0 flex-col rounded-xl border border-border bg-card p-3 shadow-card-modern">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBlock className="h-4 w-24" />
        <ShimmerBlock className="h-5 w-8 rounded-full" />
      </div>
      {Array.from({ length: cardCount }).map((_, i) => (
        <KanbanCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function PipelineLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ShimmerBlock className="h-9 w-48 rounded-lg" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
          <ShimmerBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[3, 5, 4, 2].map((count, i) => (
          <KanbanColumnSkeleton key={i} cardCount={count} />
        ))}
      </div>
    </div>
  )
}
