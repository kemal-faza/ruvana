import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </header>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-4 rounded-card border border-border bg-card p-5">
            <Skeleton className="hidden h-20 w-28 shrink-0 sm:block" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}