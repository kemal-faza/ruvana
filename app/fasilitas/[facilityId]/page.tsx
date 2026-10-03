import type { Metadata } from "next"

import { FacilityDetailContent, generateFacilityDetailMetadata } from "@/components/facilities/facility-detail"

export const dynamic = "force-dynamic"

interface FasilitasDetailPageProps {
  params: Promise<{ facilityId: string }>
  searchParams: Promise<{ date?: string }>
}

export async function generateMetadata({ params }: FasilitasDetailPageProps): Promise<Metadata> {
  const { facilityId } = await params
  return generateFacilityDetailMetadata(facilityId, "/fasilitas")
}

export default async function FasilitasDetailPage({ params, searchParams }: FasilitasDetailPageProps) {
  const { facilityId } = await params
  return <FacilityDetailContent facilityId={facilityId} searchParams={searchParams} basePath="/fasilitas" />
}
