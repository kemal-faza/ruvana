import { listPublicFacilities, type PublicFacility, type PageMeta } from "@/lib/services/facility-service"
import { parseCalendarDate } from "@/lib/time/jakarta"
import { cleanSearchParams, parsePublicListQuery, type PublicListQuery } from "@/lib/validation/facility-query"

export interface FacilityCatalogData {
  items: PublicFacility[]
  meta: PageMeta
  filterValue: Pick<PublicListQuery, "search" | "type" | "location" | "minCapacity">
  paginationQuery: Pick<PublicListQuery, "search" | "type" | "location" | "minCapacity"> & { perPage?: number; date?: string }
  hasActiveFilters: boolean
  /** Tanggal pilihan dari landing, diteruskan ke detail fasilitas agar ketersediaan langsung tampil. */
  date?: string
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

  const rawDate = typeof raw.date === "string" ? raw.date : undefined
  const date = rawDate && parseCalendarDate(rawDate) ? rawDate : undefined

  const filterValue = {
    search: query.search,
    type: query.type,
    location: query.location,
    minCapacity: query.minCapacity,
  }
  const paginationQuery = {
    ...filterValue,
    ...(query.perPage !== 20 ? { perPage: query.perPage } : {}),
    ...(date ? { date } : {}),
  }
  const { items, meta } = await listPublicFacilities(query)

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
    meta,
    filterValue,
    paginationQuery,
    hasActiveFilters: Boolean(query.search || query.type || query.location || query.minCapacity),
    date,
  }
}
