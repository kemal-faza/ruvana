import { Skeleton } from "@/components/ui/skeleton"

export default function FasilitasLoading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </header>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
