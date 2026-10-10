import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, Package, Users } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { LABEL_SATUAN_KAPASITAS, LABEL_TIPE_FASILITAS } from "@/config/labels"
import { Button } from "@/components/ui/button"
import { AvailabilityDateForm } from "@/components/facilities/availability-date-form"
import { AvailabilityGrid } from "@/components/facilities/availability-grid"
import { FacilityStatusBadge } from "@/components/facilities/facility-status-badge"
import type { FacilityDetailData } from "@/lib/facilities/detail"

interface FacilityDetailContentProps extends FacilityDetailData {
  basePath: string
}

export function FacilityDetailContent({
  facility,
  date,
  today,
  availability,
  basePath,
}: FacilityDetailContentProps) {
  const isAlat = facility.tipe === "alat"
  const KapasitasIcon = isAlat ? Package : Users
  const photo = facility.fotoUrl ?? getFacilityPhoto(facility.nama, facility.tipe)

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
            unoptimized={facility.fotoUrl !== null}
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
        <AvailabilityDateForm facilityId={facility.id} date={date} today={today} basePath={basePath} />
        {availability && <AvailabilityGrid slots={availability.slots} />}
      </div>
    </div>
  )
}
