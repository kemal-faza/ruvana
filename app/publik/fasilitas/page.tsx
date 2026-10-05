import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FacilityCatalog } from "@/components/facilities/facility-catalog"
import { getFacilityCatalog } from "@/lib/facilities/catalog"

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

export default async function PublicFasilitasPage({ searchParams }: PublicFasilitasPageProps) {
  const catalog = await getFacilityCatalog(await searchParams)
  if ("redirectQuery" in catalog) redirect(`/publik/fasilitas?${catalog.redirectQuery}`)
  return <FacilityCatalog {...catalog} basePath="/publik/fasilitas" />
}
