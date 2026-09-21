import { Building2 } from "lucide-react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FacilityCard } from "@/components/facilities/facility-card"
import type { PublicFacility } from "@/lib/services/facility-service"

interface FacilityListProps {
  items: PublicFacility[]
}

export function FacilityList({ items }: FacilityListProps) {
  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Belum ada fasilitas</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>
              Belum ada fasilitas yang bisa ditampilkan saat ini. Silakan kembali lagi nanti.
            </EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((facility, index) => (
        <FacilityCard key={facility.id} facility={facility} eager={index === 0} />
      ))}
    </div>
  )
}
