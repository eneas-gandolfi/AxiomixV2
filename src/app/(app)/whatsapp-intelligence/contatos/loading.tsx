function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ''}`} />
}

function ContactRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <ShimmerBlock className="h-10 w-10 flex-shrink-0 rounded-full" />
      <div className="flex-1">
        <ShimmerBlock className="mb-2 h-4 w-44" />
        <ShimmerBlock className="h-3 w-56" />
      </div>
      <ShimmerBlock className="h-5 w-20 rounded-full" />
      <ShimmerBlock className="h-8 w-8 rounded-md" />
    </div>
  )
}

export default function ContatosLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar (busca + filtros) */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <ShimmerBlock className="h-9 w-72 rounded-lg" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Lista de contatos */}
      <div className="rounded-xl border border-border bg-card shadow-card-modern">
        {Array.from({ length: 8 }).map((_, i) => (
          <ContactRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
