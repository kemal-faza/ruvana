import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ArrowLeft, MapPin, Package, Users } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { LABEL_SATUAN_KAPASITAS, LABEL_TIPE_FASILITAS } from "@/config/labels"
import { Button } from "@/components/ui/button"
import { FacilityStatusBadge } from "@/components/facilities/facility-status-badge"
import { getPublicFacility, type PublicFacility } from "@/lib/services/facility-service"

interface FasilitasDetailPageProps {
  params: Promise<{ facilityId: string }>
}

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return id >= 1 ? id : null
}

// React `cache` membagikan hasil query dalam satu request, sehingga
// `generateMetadata` dan halaman tidak mengambil fasilitas dua kali.
const getFacility = cache((id: number) => getPublicFacility(id))

function buildDescription(facility: PublicFacility): string {
  const deskripsi = facility.deskripsi?.trim()
  if (deskripsi) return deskripsi

  const satuan = LABEL_SATUAN_KAPASITAS[facility.tipe]
  const kapasitasLabel = facility.tipe === "alat" ? "jumlah" : "kapasitas"
  return `${LABEL_TIPE_FASILITAS[facility.tipe]} di ${facility.lokasi} dengan ${kapasitasLabel} ${facility.kapasitas} ${satuan}.`
}

export async function generateMetadata({ params }: FasilitasDetailPageProps): Promise<Metadata> {
  const { facilityId } = await params
  const id = parseId(facilityId)
  if (id === null) return {}

  const facility = await getFacility(id)
  if (!facility) return {}

  const description = buildDescription(facility)
  const path = `/fasilitas/${facility.id}`

  return {
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

export default async function FasilitasDetailPage({ params }: FasilitasDetailPageProps) {
  const { facilityId } = await params
  const id = parseId(facilityId)
  if (id === null) notFound()

  const facility = await getFacility(id)
  if (!facility) notFound()

  const isAlat = facility.tipe === "alat"
  const KapasitasIcon = isAlat ? Package : Users
  const photo = getFacilityPhoto(facility.nama, facility.tipe)

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        className="min-h-11 w-fit -ml-3"
        nativeButton={false}
        render={<Link href="/fasilitas" />}
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
            className="object-cover"
            priority
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
    </div>
  )
}
