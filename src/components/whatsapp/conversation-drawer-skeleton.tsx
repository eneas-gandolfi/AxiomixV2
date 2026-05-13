export function ConversationDrawerSkeleton() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 flex-shrink-0 rounded-full bg-[var(--color-surface-2)] animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-7 w-44 rounded bg-[var(--color-surface-2)] animate-pulse" />
            <div className="h-3 w-64 rounded bg-[var(--color-surface-2)] animate-pulse" />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="h-9 w-36 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-9 w-28 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-0 md:flex-row">
        <main className="flex-1 space-y-3 p-6">
          <div className="h-10 w-2/3 rounded-2xl bg-[var(--color-surface-2)] animate-pulse" />
          <div className="ml-auto h-14 w-3/4 rounded-2xl bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-8 w-1/2 rounded-2xl bg-[var(--color-surface-2)] animate-pulse" />
          <div className="ml-auto h-12 w-2/3 rounded-2xl bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-16 w-3/4 rounded-2xl bg-[var(--color-surface-2)] animate-pulse" />
        </main>
        <aside className="w-full shrink-0 space-y-3 border-t border-[var(--color-border)] p-6 md:w-[340px] md:border-l md:border-t-0">
          <div className="h-4 w-20 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-24 w-full rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-4 w-16 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-32 w-full rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
        </aside>
      </div>
    </div>
  );
}
