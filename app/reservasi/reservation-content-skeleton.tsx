import { Skeleton } from "@/components/ui/skeleton"

export function ReservationContentSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6" aria-hidden="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-48" />
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <p className="sr-only">Memuat form reservasi</p>
    </div>
  )
}
