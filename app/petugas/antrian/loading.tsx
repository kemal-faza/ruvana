import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingAntrian() {
  return (
    <main id="konten" tabIndex={-1}
      role="status"
      aria-busy="true"
      aria-label="Memuat antrean reservasi"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      <p className="sr-only">Memuat antrean reservasi</p>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </header>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-28" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-11 w-40" />
      </div>
    </main>
  )
}
