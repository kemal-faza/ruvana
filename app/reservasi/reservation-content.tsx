import { ReservationForm } from "@/components/reservation/reservation-form"
import { TIPE_FASILITAS } from "@/config/business"
import { computeFacilityAvailability } from "@/lib/reservations/availability"
import { listPublicFacilities } from "@/lib/services/facility-service"
import { getDefaultReservationDate, isValidDateFormat } from "@/lib/time/reservation-time"

async function getFacilities(tipe?: string) {
  const { items } = await listPublicFacilities({ page: 1, perPage: 500 })
  return items
    .filter((facility) => facility.status === "ACTIVE")
    .filter((facility) => !tipe || facility.tipe === tipe)
    .map((facility) => ({ id: facility.id, nama: facility.nama, lokasi: facility.lokasi }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
}

export async function ReservationContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const query = await searchParams

  const rawType = Array.isArray(query.type) ? query.type[0] : query.type
  const tipe = rawType && (TIPE_FASILITAS as readonly string[]).includes(rawType) ? rawType : undefined
  const facilities = await getFacilities(tipe)

  const rawFacilityId = Array.isArray(query.facilityId) ? query.facilityId[0] : query.facilityId
  const rawDate = Array.isArray(query.date) ? query.date[0] : query.date

  // Helper domain memilih H+15 agar seluruh slot pada tanggal default lolos.
  const fallbackDate = getDefaultReservationDate()
  const date = rawDate && isValidDateFormat(rawDate) ? rawDate : fallbackDate

  const parsedFacilityId = rawFacilityId ? Number(rawFacilityId) : NaN
  const facilityId = facilities.some((f) => f.id === parsedFacilityId)
    ? parsedFacilityId
    : (facilities[0]?.id ?? 0)

  const availability =
    facilityId > 0 ? await computeFacilityAvailability(facilityId, date) : null

  // Waktu server saat render: pemilih slot menghitung jendela 14 hari dari
  // instant ini, bukan dari jam klien.
  const serverNow = new Date().toISOString()

  return (
    <ReservationForm
      facilities={facilities}
      facilityId={facilityId}
      date={date}
      type={tipe}
      availability={availability}
      serverNow={serverNow}
    />
  )
}
