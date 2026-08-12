function Shimmer({ className }: { className: string }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded ${className}`} />;
}

export function DashboardCommandCenterSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-6 md:p-8"
      aria-busy="true"
      aria-label="Carregando painel de comando"
    >
      <div className="space-y-2 px-1">
        <Shimmer className="h-8 w-64" />
        <Shimmer className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <div aria-label="Carregando próxima ação" className="rounded-[18px] border border-border bg-card p-5">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="mt-4 h-8 w-72 max-w-full" />
          <Shimmer className="mt-3 h-4 w-96 max-w-full" />
          <Shimmer className="mt-5 h-10 w-40" />
        </div>
        <div className="rounded-[18px] border border-border bg-card p-5">
          <Shimmer className="h-5 w-32" />
          <div className="mt-4 grid gap-2">
            {[0, 1, 2].map((item) => (
              <Shimmer key={item} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-border bg-card p-4">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="mt-4 h-8 w-16" />
            <Shimmer className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-4" aria-label="Carregando radar de grupos">
          <div className="rounded-[18px] border border-border bg-card p-5">
            <Shimmer className="h-5 w-56" />
            <div className="mt-4 grid gap-2.5">
              {[0, 1, 2].map((item) => (
                <Shimmer key={item} className="h-[76px] w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="rounded-[18px] border border-border bg-card p-3">
            {[0, 1, 2].map((item) => (
              <Shimmer key={item} className="mb-2 h-12 w-full rounded-xl last:mb-0" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label="Carregando atalhos operacionais">
            {[0, 1, 2].map((item) => (
              <Shimmer key={item} className="h-[72px] w-full rounded-2xl" />
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-4" aria-label="Carregando gargalos de vendas">
          <div className="rounded-[18px] border border-border bg-card p-5">
            <Shimmer className="h-5 w-32" />
            <div className="mt-4 grid gap-3">
              {[0, 1, 2].map((item) => (
                <Shimmer key={item} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="rounded-[18px] border border-border bg-card p-5">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="mt-4 h-32 w-full rounded-xl" />
          </div>
        </aside>
      </div>
    </div>
  );
}
