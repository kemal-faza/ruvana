import Link from "next/link"
import { Building2, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FacilityCard } from "@/components/facilities/facility-card"
import type { PublicFacility } from "@/lib/services/facility-service"

interface FacilityListProps {
  items: PublicFacility[]
  /** True ketika ada filter/pencarian aktif, supaya empty state membedakan "kosong" vs "tidak cocok". */
  hasActiveFilters?: boolean
}

export function FacilityList({ items, hasActiveFilters = false }: FacilityListProps) {
  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Tidak ada fasilitas yang cocok</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>
                Tidak ada fasilitas yang memenuhi seluruh filter aktif. Coba ubah atau hapus filter.
              </EmptyDescription>
              <Button
                variant="outline"
                className="min-h-11"
                nativeButton={false}
                render={<Link href="/fasilitas" />}
              >
                Reset
              </Button>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      )
    }

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
