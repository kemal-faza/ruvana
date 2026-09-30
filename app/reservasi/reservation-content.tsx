import { ReservationForm } from "@/components/reservation/reservation-form"
import { computeFacilityAvailability } from "@/lib/reservations/availability"
import { listPublicFacilities } from "@/lib/services/facility-service"
import { isValidDateFormat } from "@/lib/time/reservation-time"

async function getFacilities() {
  const { items } = await listPublicFacilities({ page: 1, perPage: 500 })
  return items
    .filter((facility) => facility.status === "ACTIVE")
    .map((facility) => ({ id: facility.id, nama: facility.nama, lokasi: facility.lokasi }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
}

export async function ReservationContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const facilities = await getFacilities()
  const query = await searchParams

  const rawFacilityId = Array.isArray(query.facilityId) ? query.facilityId[0] : query.facilityId
  const rawDate = Array.isArray(query.date) ? query.date[0] : query.date

  const fallbackDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const date = rawDate && isValidDateFormat(rawDate) ? rawDate : fallbackDate

  const parsedFacilityId = rawFacilityId ? Number(rawFacilityId) : NaN
  const facilityId = facilities.some((f) => f.id === parsedFacilityId)
    ? parsedFacilityId
    : (facilities[0]?.id ?? 0)

  const availability =
    facilityId > 0 ? await computeFacilityAvailability(facilityId, date) : null

  return (
    <ReservationForm
      key={`${facilityId}:${date}`}
      facilities={facilities}
      facilityId={facilityId}
      date={date}
      availability={availability}
    />
  )
}
