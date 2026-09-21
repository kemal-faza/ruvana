import type { Metadata } from "next"

import { FacilityList } from "@/components/facilities/facility-list"
import { listPublicFacilities } from "@/lib/services/facility-service"

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

export default async function FasilitasPage() {
  const { items } = await listPublicFacilities({ page: 1, perPage: 20 })

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Fasilitas</h1>
        <p className="max-w-2xl text-muted-foreground">
          Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini.
        </p>
      </header>

      <FacilityList items={items} />
    </div>
  )
}
