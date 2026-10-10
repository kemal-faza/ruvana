import { Skeleton } from "@/components/ui/skeleton"

export default function RiwayatReservasiLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat riwayat reservasi">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" aria-hidden="true">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-11 w-44" />
      </header>
      <div className="flex flex-col gap-5" aria-hidden="true">
        <Skeleton className="h-11 w-full max-w-xs" />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat riwayat reservasi…</span>
    </div>
  )
}
