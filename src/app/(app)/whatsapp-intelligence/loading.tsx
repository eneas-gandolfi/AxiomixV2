import type { CSSProperties } from "react";

function ShimmerBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className ?? ""}`} style={style} />;
}

export default function WhatsAppIntelligenceLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando módulo de inteligência"
      className="space-y-5"
    >
      <nav
        aria-label="Carregando navegação da inteligência"
        className="border-b border-border"
      >
        <div className="flex gap-1 overflow-x-auto px-1 pb-px">
          {[140, 210, 120, 120].map((width, index) => (
            <ShimmerBlock
              key={index}
              className="h-10 rounded-t-lg"
              style={{ width }}
            />
          ))}
        </div>
      </nav>

      <section aria-label="Carregando painel principal da inteligência" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <ShimmerBlock className="h-9 w-72 max-w-full" />
            <ShimmerBlock className="h-4 w-[420px] max-w-full" />
          </div>
          <div className="flex gap-2">
            <ShimmerBlock className="h-9 w-32 rounded-lg" />
            <ShimmerBlock className="h-9 w-40 rounded-lg" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card p-4">
              <ShimmerBlock className="h-3 w-24" />
              <ShimmerBlock className="mt-3 h-8 w-14" />
              <ShimmerBlock className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <ShimmerBlock className="h-5 w-36" />
                <ShimmerBlock className="mt-2 h-3 w-56" />
              </div>
              {[0, 1, 2].map((item) => (
                <div key={item} className="grid gap-3 border-b border-border/70 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_160px]">
                  <div className="flex items-center gap-3">
                    <ShimmerBlock className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <ShimmerBlock className="h-4 w-40" />
                      <ShimmerBlock className="mt-2 h-3 w-28" />
                    </div>
                  </div>
                  <ShimmerBlock className="h-8 w-20" />
                  <ShimmerBlock className="h-8 w-full" />
                  <ShimmerBlock className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <ShimmerBlock className="h-5 w-32" />
              <div className="mt-4 grid gap-2">
                {[0, 1, 2].map((item) => (
                  <ShimmerBlock key={item} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <ShimmerBlock className="h-5 w-36" />
              <ShimmerBlock className="mt-4 h-28 w-full rounded-xl" />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <ShimmerBlock className="h-5 w-32" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ShimmerBlock className="h-16 rounded-lg" />
                <ShimmerBlock className="h-16 rounded-lg" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
