import { Skeleton } from "@/components/ui/skeleton";

// Skeleton area konten saja; shell (sidebar + navigasi), landmark main, dan
// padding disediakan layout segmen. loading.tsx bersarang DI DALAM layout, jadi
// mengulang <main id="konten"> di sini menghasilkan dua landmark main sekaligus
// id konten ganda.
export default function ReservasiLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <p className="sr-only">Memuat halaman reservasi</p>
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </header>
      <div className="flex flex-col gap-5 rounded-card border border-border bg-card p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-48" />
      </div>
    </div>
  );
}
