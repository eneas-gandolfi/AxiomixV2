function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <ShimmerBlock className="h-10 w-10 flex-shrink-0 rounded-full" />
      <div className="flex-1">
        <ShimmerBlock className="mb-2 h-4 w-40" />
        <ShimmerBlock className="h-3 w-64" />
      </div>
      <ShimmerBlock className="h-5 w-16 rounded-full" />
    </div>
  );
}

export default function ConversasLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ShimmerBlock className="h-9 w-64 rounded-lg" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-9 w-28 rounded-lg" />
          <ShimmerBlock className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="rounded-xl border border-border bg-card shadow-card-modern">
        {Array.from({ length: 8 }).map((_, i) => (
          <ConversationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
