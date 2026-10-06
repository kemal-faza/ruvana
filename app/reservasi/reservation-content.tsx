import { ReservationForm } from "@/components/reservation/reservation-form"
import { TIPE_FASILITAS } from "@/config/business"
import { computeFacilityAvailability } from "@/lib/reservations/availability"
import { listPublicFacilities } from "@/lib/services/facility-service"
import { getTodayDateAsiaJakarta, isValidDateFormat } from "@/lib/time/reservation-time"

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

  // Tanggal default H+2 kalender Asia/Jakarta agar seluruh slot lolos batas
  // pengajuan H-1 berapa pun jam saat halaman dibuka.
  const fallbackDate = (() => {
    const [y, m, d] = getTodayDateAsiaJakarta(new Date()).split("-").map(Number)
    return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 2)).toISOString().slice(0, 10)
  })()
  const date = rawDate && isValidDateFormat(rawDate) ? rawDate : fallbackDate

  const parsedFacilityId = rawFacilityId ? Number(rawFacilityId) : NaN
  const facilityId = facilities.some((f) => f.id === parsedFacilityId)
    ? parsedFacilityId
    : (facilities[0]?.id ?? 0)

  const availability =
    facilityId > 0 ? await computeFacilityAvailability(facilityId, date) : null

  // Waktu server saat render: pemilih slot menghitung jendela 24 jam dari
  // instant ini, bukan dari jam klien.
  const serverNow = new Date().toISOString()

  return (
    <ReservationForm
      key={`${facilityId}:${date}`}
      facilities={facilities}
      facilityId={facilityId}
      date={date}
      availability={availability}
      serverNow={serverNow}
    />
  )
}
