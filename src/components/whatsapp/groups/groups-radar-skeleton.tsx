export function GroupsRadarSkeleton() {
  return (
    <div className="space-y-4" aria-live="polite">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-8 w-28 animate-pulse rounded bg-[var(--color-surface-2)]" />
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Carregando grupos em foco
          </p>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-[88px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        ))}
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="h-[112px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                aria-label="Carregando card de grupo"
                className="h-[124px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        </div>
        <div className="h-[320px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
      </section>
    </div>
  );
}
