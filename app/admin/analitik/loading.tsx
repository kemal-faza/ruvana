import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalitikLoading() {
  return (
    <main
      aria-label="Memuat analitik"
      aria-busy="true"
      className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          <Skeleton className="h-11 w-full sm:w-28" />
          <Skeleton className="h-11 w-full sm:w-28" />
          <Skeleton className="h-11 w-full sm:w-28" />
        </div>
      </header>

      <Skeleton className="h-19 rounded-card sm:hidden" />
      <Skeleton className="hidden h-62 rounded-card sm:block xl:h-25.5" />

      <section aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-44 rounded-card" />
      </section>

      <section aria-hidden="true" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
          <Skeleton className="h-96 rounded-card" />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Skeleton className="h-80 rounded-card" />
            <Skeleton className="h-60 rounded-card" />
          </div>
        </div>
      </section>

      <section aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-card" />
      </section>

      <span className="sr-only">Memuat analitik…</span>
    </main>
  );
}
