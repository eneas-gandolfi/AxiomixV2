function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} />;
}

function ContactRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <ShimmerBlock className="h-9 w-9 flex-shrink-0 rounded-full" />
      <div className="flex-1">
        <ShimmerBlock className="mb-2 h-4 w-44" />
        <ShimmerBlock className="h-3 w-32" />
      </div>
      <ShimmerBlock className="h-5 w-14 rounded-full" />
    </div>
  );
}

function LabelRowSkeleton() {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <ShimmerBlock className="h-3 w-3 rounded-full" />
      <ShimmerBlock className="h-3 w-24" />
    </div>
  );
}

export default function ContatosLoading() {
  return (
    <div aria-busy="true">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <ShimmerBlock className="h-9 w-72 rounded-lg" />
        <ShimmerBlock className="h-9 w-36 rounded-lg" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabela de contatos */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-card-modern">
            <div className="border-b border-border p-4">
              <ShimmerBlock className="h-5 w-32" />
            </div>
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <ContactRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Labels manager */}
        <div>
          <div className="rounded-xl border border-border bg-card shadow-card-modern">
            <div className="border-b border-border p-4">
              <ShimmerBlock className="h-5 w-24" />
            </div>
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <LabelRowSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
