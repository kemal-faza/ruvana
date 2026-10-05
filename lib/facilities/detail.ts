import type { Metadata } from "next"
import { cache } from "react"

import { LABEL_SATUAN_KAPASITAS, LABEL_TIPE_FASILITAS } from "@/config/labels"
import { getFacilityAvailability, type AvailabilityResponse } from "@/lib/services/availability-service"
import { getPublicFacility, type PublicFacility } from "@/lib/services/facility-service"
import { parseCalendarDate, todayJakarta } from "@/lib/time/jakarta"
import { parseFacilityId } from "@/lib/validation/facility-query"

const getFacility = cache((id: number) => getPublicFacility(id))

export interface FacilityDetailData {
  facility: PublicFacility
  date: string
  today: string
  availability: AvailabilityResponse | null
}

function facilityIdNumber(raw: string): number | null {
  const parsed = parseFacilityId(raw)
  return parsed.ok ? parsed.value : null
}

export async function getFacilityDetail(facilityId: string, rawDate?: string): Promise<FacilityDetailData | null> {
  const id = facilityIdNumber(facilityId)
  if (id === null) return null

  const facility = await getFacility(id)
  if (!facility) return null

  const today = todayJakarta()
  const date = rawDate && parseCalendarDate(rawDate) ? rawDate : today
  const availability = await getFacilityAvailability(id, date)

  return { facility, date, today, availability }
}

function buildDescription(facility: PublicFacility): string {
  const deskripsi = facility.deskripsi?.trim()
  if (deskripsi) return deskripsi

  const satuan = LABEL_SATUAN_KAPASITAS[facility.tipe]
  const kapasitasLabel = facility.tipe === "alat" ? "jumlah" : "kapasitas"
  return `${LABEL_TIPE_FASILITAS[facility.tipe]} di ${facility.lokasi} dengan ${kapasitasLabel} ${facility.kapasitas} ${satuan}.`
}

export async function generateFacilityDetailMetadata(facilityId: string, basePath: string): Promise<Metadata> {
  const id = facilityIdNumber(facilityId)
  if (id === null) return {}

  const facility = await getFacility(id)
  if (!facility) return {}

  const description = buildDescription(facility)
  const path = `${basePath}/${facility.id}`

  return {
    title: `${facility.nama} | ruvana`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: "ruvana",
      description,
      url: path,
    },
  }
}
