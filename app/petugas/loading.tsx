export default function LoadingPetugasDashboard() {
  return (
    <main aria-label="Memuat dashboard Petugas" aria-busy="true" className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-muted" />
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]" aria-hidden="true">
        <div className="h-40 animate-pulse rounded-xl border bg-muted/50" />
        <div className="h-56 animate-pulse rounded-xl border bg-muted/50" />
      </div>
      <span className="sr-only">Memuat dashboard Petugas…</span>
    </main>
  );
}
