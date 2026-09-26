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
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      </header>

      <Skeleton className="h-24 rounded-card" />

      <section aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-44 rounded-card" />
      </section>

      <section aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-44" />
        <div className="grid gap-3 xl:grid-cols-3">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </section>

      <span className="sr-only">Memuat analitik…</span>
    </main>
  );
}
