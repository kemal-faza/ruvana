import Image from "next/image"
import { ChevronRight, Clock, FileImage, MapPin } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"
import { formatRelatif } from "@/components/reports/format"
import type { ReportItem } from "@/lib/services/report-service"

interface ReportCardProps {
  report: ReportItem
  onSelect: (id: number) => void
}

export function ReportCard({ report, onSelect }: ReportCardProps) {
  const photo = report.fotoUrl ?? getFacilityPhoto(report.facilityNama, report.facilityTipe)

  return (
    <button
      type="button"
      onClick={() => onSelect(report.id)}
      className="group flex w-full cursor-pointer items-start gap-4 rounded-card border border-border bg-card p-4 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 hover:border-primary/40 hover:bg-accent/40"
    >
      {photo ? (
        <span className="relative hidden size-20 shrink-0 overflow-hidden rounded-md sm:block">
          <Image
            src={photo}
            alt={`Foto ${report.kategori} di ${report.facilityNama}`}
            fill
            sizes="80px"
            unoptimized
            className="object-cover"
          />
        </span>
      ) : (
        <span className="hidden size-20 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex">
          <FileImage aria-hidden="true" className="size-6" />
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge status={report.status} />
          <span className="text-xs text-muted-foreground">{report.kategori}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock aria-hidden="true" className="size-3.5 shrink-0" />
            {formatRelatif(report.createdAt)}
          </span>
        </span>
        <span className="truncate font-medium text-foreground">{report.facilityNama}</span>
        <span className="line-clamp-2 text-sm text-muted-foreground">{report.deskripsi}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {report.facilityLokasi}
        </span>
      </span>

      <ChevronRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-motion-micro ease-motion-standard group-hover:translate-x-0.5"
      />
    </button>
  )
}
