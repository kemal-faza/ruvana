import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingPengguna() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Memuat daftar pengguna"
      className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      <p className="sr-only">Memuat daftar pengguna</p>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-32" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-card" />
        ))}
      </div>

      <Skeleton className="h-14 w-full rounded-card" />

      <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </main>
  )
}
