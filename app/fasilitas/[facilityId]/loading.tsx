import { Skeleton } from "@/components/ui/skeleton"

export default function FasilitasDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>

      <Skeleton className="h-20 w-full" />
    </div>
  )
}
