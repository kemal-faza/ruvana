import type { Metadata } from "next"

import { FacilityDetailContent, generateFacilityDetailMetadata } from "@/components/facilities/facility-detail"

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
  return <FacilityDetailContent facilityId={facilityId} searchParams={searchParams} basePath="/publik/fasilitas" />
}
