import { Skeleton } from "@/components/ui/skeleton";

// Skeleton area konten saja; shell (sidebar + navigasi) disediakan layout
// segmen sehingga tetap tampil selama halaman dimuat.
export default function ReservasiLoading() {
  return (
    <main
      id="konten"
      tabIndex={-1}
      role="status"
      aria-busy="true"
      aria-label="Memuat halaman reservasi"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
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
    </main>
  );
}
