function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
      <ShimmerBlock className="mb-2 h-4 w-32" />
      <ShimmerBlock className="mb-2 h-3 w-24" />
      <div className="flex items-center gap-2">
        <ShimmerBlock className="h-5 w-12 rounded-full" />
        <ShimmerBlock className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

function KanbanColumnSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBlock className="h-4 w-24" />
        <ShimmerBlock className="h-5 w-6 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function PipelineLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      {/* Board selector */}
      <div className="flex items-center gap-2">
        <ShimmerBlock className="h-4 w-4 rounded" />
        <ShimmerBlock className="h-9 w-48 rounded-lg" />
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumnSkeleton cardCount={3} />
        <KanbanColumnSkeleton cardCount={2} />
        <KanbanColumnSkeleton cardCount={4} />
        <KanbanColumnSkeleton cardCount={1} />
      </div>
    </div>
  );
}
