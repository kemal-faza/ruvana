import Image from "next/image"
import Link from "next/link"
import { MapPin, Package, Users } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { LABEL_SATUAN_KAPASITAS, LABEL_TIPE_FASILITAS } from "@/config/labels"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FacilityStatusBadge } from "@/components/facilities/facility-status-badge"
import type { PublicFacility } from "@/lib/services/facility-service"

interface FacilityCardProps {
  facility: PublicFacility
}

export function FacilityCard({ facility }: FacilityCardProps) {
  const isAlat = facility.tipe === "alat"
  const KapasitasIcon = isAlat ? Package : Users
  const photo = getFacilityPhoto(facility.nama, facility.tipe)

  return (
    <Card>
      {photo && (
        <div className="relative -mx-6 -mt-6 aspect-video overflow-hidden">
          <Image
            src={photo}
            alt={facility.nama}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-lg font-heading">{facility.nama}</CardTitle>
        <CardDescription>{LABEL_TIPE_FASILITAS[facility.tipe]}</CardDescription>
        <CardAction>
          <FacilityStatusBadge status={facility.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          <span>{facility.lokasi}</span>
        </p>
        <p className="flex items-center gap-2">
          <KapasitasIcon aria-hidden="true" className="size-4 shrink-0" />
          <span>
            {isAlat ? "Jumlah" : "Kapasitas"} {facility.kapasitas} {LABEL_SATUAN_KAPASITAS[facility.tipe]}
          </span>
        </p>
        {facility.deskripsi && <p className="line-clamp-2">{facility.deskripsi}</p>}
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="min-h-11 w-full"
          nativeButton={false}
          render={<Link href={`/fasilitas/${facility.id}`} />}
        >
          Lihat detail
        </Button>
      </CardFooter>
    </Card>
  )
}
