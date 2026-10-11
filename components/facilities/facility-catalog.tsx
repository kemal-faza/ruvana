import { FacilityFilterForm } from "@/components/facilities/facility-filter-form"
import { FacilityList } from "@/components/facilities/facility-list"
import { FacilityPagination } from "@/components/facilities/facility-pagination"
import type { FacilityCatalogData } from "@/lib/facilities/catalog"

interface FacilityCatalogProps extends FacilityCatalogData {
  basePath: string
  /**
   * Apakah pengunjung katalog bisa memulai reservasi dari halaman detail.
   * Petugas dan admin hanya melihat ketersediaan statis di sana, jadi label
   * aksi kartunya menyesuaikan.
   */
  canStartReservation?: boolean
}

export function FacilityCatalog({
  items,
  meta,
  filterValue,
  paginationQuery,
  hasActiveFilters,
  basePath,
  date,
  canStartReservation = true,
}: FacilityCatalogProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Fasilitas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Cari fasilitas berdasarkan nama, tipe, lokasi, atau kapasitas.
        </p>
      </header>

      <FacilityFilterForm value={filterValue} actionPath={basePath} date={date} />

      <FacilityList
        items={items}
        hasActiveFilters={hasActiveFilters}
        basePath={basePath}
        detailBasePath={basePath}
        date={date}
        canStartReservation={canStartReservation}
      />

      <FacilityPagination page={meta.page} totalPages={meta.totalPages} query={paginationQuery} basePath={basePath} />
    </div>
  )
}
