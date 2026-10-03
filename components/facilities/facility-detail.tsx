import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ArrowLeft, CalendarDays, MapPin, Package, Users } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { LABEL_SATUAN_KAPASITAS, LABEL_TIPE_FASILITAS } from "@/config/labels"
import { Button } from "@/components/ui/button"
import { AvailabilityDateForm } from "@/components/facilities/availability-date-form"
import { AvailabilityGrid } from "@/components/facilities/availability-grid"
import { FacilityStatusBadge } from "@/components/facilities/facility-status-badge"
import { getPublicFacility, type PublicFacility } from "@/lib/services/facility-service"
import { getFacilityAvailability } from "@/lib/services/availability-service"
import { parseCalendarDate, todayJakarta } from "@/lib/time/jakarta"

const getFacility = cache((id: number) => getPublicFacility(id))

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return id >= 1 ? id : null
}

function buildDescription(facility: PublicFacility): string {
  const deskripsi = facility.deskripsi?.trim()
  if (deskripsi) return deskripsi

  const satuan = LABEL_SATUAN_KAPASITAS[facility.tipe]
  const kapasitasLabel = facility.tipe === "alat" ? "jumlah" : "kapasitas"
  return `${LABEL_TIPE_FASILITAS[facility.tipe]} di ${facility.lokasi} dengan ${kapasitasLabel} ${facility.kapasitas} ${satuan}.`
}

export async function generateFacilityDetailMetadata(facilityId: string, basePath: string): Promise<Metadata> {
  const id = parseId(facilityId)
  if (id === null) return {}

  const facility = await getFacility(id)
  if (!facility) return {}

  const description = buildDescription(facility)
  const path = `${basePath}/${facility.id}`

  return {
    title: `${facility.nama} | ruvana`,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "article",
      title: "ruvana",
      description,
      url: path,
    },
  }
}

interface FacilityDetailContentProps {
  facilityId: string
  searchParams: Promise<{ date?: string }>
  basePath: string
}

export async function FacilityDetailContent({
  facilityId,
  searchParams,
  basePath,
}: FacilityDetailContentProps) {
  const id = parseId(facilityId)
  if (id === null) notFound()

  const facility = await getFacility(id)
  if (!facility) notFound()

  const isAlat = facility.tipe === "alat"
  const KapasitasIcon = isAlat ? Package : Users
  const photo = getFacilityPhoto(facility.nama, facility.tipe)

  const today = todayJakarta()
  const { date: rawDate } = await searchParams
  const date = rawDate && parseCalendarDate(rawDate) ? rawDate : today
  const availability = await getFacilityAvailability(id, date)

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        className="min-h-11 w-fit -ml-3"
        nativeButton={false}
        render={<Link href={basePath} />}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Kembali ke daftar fasilitas
      </Button>

      {photo && (
        <div className="relative aspect-video w-full overflow-hidden rounded-card">
          <Image
            src={photo}
            alt={facility.nama}
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            loading="eager"
            className="object-cover"
          />
        </div>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{facility.nama}</h1>
          <FacilityStatusBadge status={facility.status} />
        </div>
        <p className="text-muted-foreground">{LABEL_TIPE_FASILITAS[facility.tipe]}</p>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-card border border-border bg-card p-4">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-sm text-muted-foreground">Lokasi</dt>
            <dd className="font-medium">{facility.lokasi}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-card border border-border bg-card p-4">
          <KapasitasIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <dt className="text-sm text-muted-foreground">{isAlat ? "Jumlah" : "Kapasitas"}</dt>
            <dd className="font-medium">
              {facility.kapasitas} {LABEL_SATUAN_KAPASITAS[facility.tipe]}
            </dd>
          </div>
        </div>
      </dl>

      {facility.deskripsi && (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">Deskripsi</h2>
          <p className="text-muted-foreground">{facility.deskripsi}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <CalendarDays aria-hidden="true" className="size-5" />
          Ketersediaan slot
        </h2>
        <AvailabilityDateForm facilityId={id} date={date} today={today} basePath={basePath} />
        {availability && <AvailabilityGrid slots={availability.slots} />}
      </div>
    </div>
  )
}
