import type { Metadata } from "next"

import { FacilityFilterForm } from "@/components/facilities/facility-filter-form"
import { FacilityList } from "@/components/facilities/facility-list"
import { FacilityPagination } from "@/components/facilities/facility-pagination"
import { listPublicFacilities } from "@/lib/services/facility-service"
import { cleanSearchParams, parsePublicListQuery } from "@/lib/validation/facility-query"

export const dynamic = "force-dynamic"

const description =
  "Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini."

export const metadata: Metadata = {
  title: "ruvana",
  description,
  alternates: {
    canonical: "/fasilitas",
  },
  openGraph: {
    type: "website",
    title: "ruvana",
    description,
    url: "/fasilitas",
  },
}

interface FasilitasPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FasilitasPage({ searchParams }: FasilitasPageProps) {
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

  const { items, meta } = await listPublicFacilities(query)

  const hasActiveFilters = Boolean(query.search || query.type || query.location || query.minCapacity)

  const filterValue = {
    search: query.search,
    type: query.type,
    location: query.location,
    minCapacity: query.minCapacity,
  }

  const paginationQuery = {
    search: query.search,
    type: query.type,
    location: query.location,
    minCapacity: query.minCapacity,
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Fasilitas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini.
        </p>
      </header>

      <FacilityFilterForm value={filterValue} />

      <FacilityList items={items} hasActiveFilters={hasActiveFilters} />

      <FacilityPagination page={meta.page} totalPages={meta.totalPages} query={paginationQuery} />
    </div>
  )
}
