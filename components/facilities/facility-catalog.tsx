import { FacilityFilterForm } from "@/components/facilities/facility-filter-form"
import { FacilityList } from "@/components/facilities/facility-list"
import { FacilityPagination } from "@/components/facilities/facility-pagination"
import type { FacilityCatalogData } from "@/lib/facilities/catalog"

interface FacilityCatalogProps extends FacilityCatalogData {
  basePath: string
}

export function FacilityCatalog({ items, locations, meta, filterValue, paginationQuery, hasActiveFilters, basePath }: FacilityCatalogProps) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Fasilitas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini.
        </p>
      </header>

      <FacilityFilterForm value={filterValue} locations={locations} actionPath={basePath} />

      <FacilityList
        items={items}
        hasActiveFilters={hasActiveFilters}
        basePath={basePath}
        detailBasePath={basePath}
      />

      <FacilityPagination page={meta.page} totalPages={meta.totalPages} query={paginationQuery} basePath={basePath} />
    </div>
  )
}
