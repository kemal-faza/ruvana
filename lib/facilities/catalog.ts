import { listPublicFacilities, listPublicLocations, type PublicFacility, type PageMeta } from "@/lib/services/facility-service"
import { cleanSearchParams, parsePublicListQuery, type PublicListQuery } from "@/lib/validation/facility-query"

export interface FacilityCatalogData {
  items: PublicFacility[]
  locations: string[]
  meta: PageMeta
  filterValue: Pick<PublicListQuery, "search" | "type" | "location" | "minCapacity">
  paginationQuery: Pick<PublicListQuery, "search" | "type" | "location" | "minCapacity"> & { perPage?: number }
  hasActiveFilters: boolean
}

export async function getFacilityCatalog(
  raw: Record<string, string | string[] | undefined>,
): Promise<{ redirectQuery: string } | FacilityCatalogData> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value)
  }

  // Halaman lebih permisif daripada API: nilai form kosong dibuang dulu, dan bila
  // filter tetap tidak valid, jatuh ke daftar tanpa filter alih-alih menampilkan error.
  const parsed = parsePublicListQuery(cleanSearchParams(params))
  const query: PublicListQuery = parsed.ok ? parsed.value : { page: 1, perPage: 20 }

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
  const [{ items, meta }, locations] = await Promise.all([listPublicFacilities(query), listPublicLocations()])

  if (meta.totalPages > 0 && query.page > meta.totalPages) {
    const canonicalParams = new URLSearchParams()
    for (const [key, value] of Object.entries(paginationQuery)) {
      if (value !== undefined && value !== "") canonicalParams.set(key, String(value))
    }
    canonicalParams.set("page", String(meta.totalPages))
    return { redirectQuery: canonicalParams.toString() }
  }

  return {
    items,
    locations,
    meta,
    filterValue,
    paginationQuery,
    hasActiveFilters: Boolean(query.search || query.type || query.location || query.minCapacity),
  }
}
