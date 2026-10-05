import { redirect } from "next/navigation"

import { FacilityFilterForm } from "@/components/facilities/facility-filter-form"
import { FacilityList } from "@/components/facilities/facility-list"
import { FacilityPagination } from "@/components/facilities/facility-pagination"
import { listPublicFacilities } from "@/lib/services/facility-service"
import { cleanSearchParams, parsePublicListQuery } from "@/lib/validation/facility-query"

interface FacilityCatalogProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  basePath: string
}

export async function FacilityCatalog({ searchParams, basePath }: FacilityCatalogProps) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      params.set(key, value)
    }
  }

  // Halaman lebih permisif daripada API: nilai form kosong dibuang dulu, dan bila
  // filter tetap tidak valid, jatuh ke daftar tanpa filter alih-alih menampilkan error.
  const parsed = parsePublicListQuery(cleanSearchParams(params))
  const query = parsed.ok ? parsed.value : { page: 1, perPage: 20 }

  const hasActiveFilters = Boolean(query.search || query.type || query.location || query.minCapacity)

  const filterValue = {
    search: query.search,
    type: query.type,
    location: query.location,
    minCapacity: query.minCapacity,
  }

  const paginationQuery = {
    ...filterValue,
    ...(query.perPage !== 20 ? { perPage: query.perPage } : {}),
  }

  const { items, meta } = await listPublicFacilities(query)

  if (meta.totalPages > 0 && query.page > meta.totalPages) {
    const canonicalParams = new URLSearchParams()
    for (const [key, value] of Object.entries(paginationQuery)) {
      if (value !== undefined && value !== "") {
        canonicalParams.set(key, String(value))
      }
    }
    canonicalParams.set("page", String(meta.totalPages))
    redirect(`${basePath}?${canonicalParams.toString()}`)
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Fasilitas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini.
        </p>
      </header>

      <FacilityFilterForm value={filterValue} actionPath={basePath} />

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
