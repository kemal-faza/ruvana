import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FacilityDetailContent } from "@/components/facilities/facility-detail"
import { generateFacilityDetailMetadata, getFacilityDetail } from "@/lib/facilities/detail"

export const dynamic = "force-dynamic"

interface PublicFasilitasDetailPageProps {
  params: Promise<{ facilityId: string }>
  searchParams: Promise<{ date?: string }>
}

export async function generateMetadata({ params }: PublicFasilitasDetailPageProps): Promise<Metadata> {
  const { facilityId } = await params
  return generateFacilityDetailMetadata(facilityId, "/publik/fasilitas")
}

export default async function PublicFasilitasDetailPage({
  params,
  searchParams,
}: PublicFasilitasDetailPageProps) {
  const { facilityId } = await params
  const { date } = await searchParams
  const detail = await getFacilityDetail(facilityId, date)
  if (!detail) notFound()
  return <FacilityDetailContent {...detail} basePath="/publik/fasilitas" />
}
