import type { Metadata } from "next"

import { FacilityCatalog } from "@/components/facilities/facility-catalog"

export const dynamic = "force-dynamic"

const description =
  "Lihat fasilitas kampus yang tersedia lengkap dengan lokasi, kapasitas, dan status terkini."

export const metadata: Metadata = {
  title: "Fasilitas | ruvana",
  description,
  alternates: {
    canonical: "/publik/fasilitas",
  },
  openGraph: {
    type: "website",
    title: "ruvana",
    description,
    url: "/publik/fasilitas",
  },
}

interface PublicFasilitasPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default function PublicFasilitasPage({ searchParams }: PublicFasilitasPageProps) {
  return <FacilityCatalog searchParams={searchParams} basePath="/publik/fasilitas" />
}
