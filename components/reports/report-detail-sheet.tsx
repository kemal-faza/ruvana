"use client"

import Image from "next/image"
import { CalendarClock, ClipboardCheck, FileImage, MapPin, UserRound } from "lucide-react"

import { getFacilityPhoto } from "@/config/facility-photos"
import { LABEL_TIPE_FASILITAS } from "@/config/labels"
import { formatWaktu } from "@/components/reports/format"
import { ReportStatusBadge } from "@/components/reports/report-status-badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ReportItem } from "@/lib/services/report-service"
import type { StatusFasilitas } from "@/generated/prisma/enums"

const LABEL_STATUS_FASILITAS_DETAIL: Record<StatusFasilitas, string> = {
  ACTIVE: "Aktif",
  UNDER_MAINTENANCE: "Perawatan",
  INACTIVE: "Nonaktif",
}

interface ReportDetailSheetProps {
  report: ReportItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailSheet({ report, open, onOpenChange }: ReportDetailSheetProps) {
  if (!report) return null

  const photo = report.fotoPath ?? getFacilityPhoto(report.facilityNama, report.facilityTipe)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detail laporan</SheetTitle>
          <SheetDescription>Kode laporan #LP-{report.id.toString().padStart(4, "0")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-0">
          {photo ? (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <Image
                src={photo}
                alt={`Foto ${report.kategori} di ${report.facilityNama}`}
                fill
                sizes="(min-width: 640px) 384px, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileImage aria-hidden="true" className="size-8" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <span className="text-sm text-muted-foreground">{report.kategori}</span>
          </div>

          <div>
            <h2 className="font-heading text-base font-medium text-foreground">{report.facilityNama}</h2>
            <p className="text-sm text-muted-foreground">
              {LABEL_TIPE_FASILITAS[report.facilityTipe]} - {LABEL_STATUS_FASILITAS_DETAIL[report.facilityStatus]}
            </p>
          </div>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                Lokasi
              </dt>
              <dd className="text-right">{report.facilityLokasi}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                Diajukan
              </dt>
              <dd className="text-right">{formatWaktu(report.createdAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                Ditangani oleh
              </dt>
              <dd className="text-right">
                {report.ditanganiOleh ? (
                  <span className="flex flex-col items-end">
                    <span>{report.ditanganiOleh.nama}</span>
                    <span className="text-xs text-muted-foreground capitalize">{report.ditanganiOleh.role}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Belum ditetapkan</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="rounded-card border border-border bg-card p-4">
            <h3 className="mb-1.5 font-medium text-foreground">Deskripsi kerusakan</h3>
            <p className="text-sm/relaxed text-muted-foreground">{report.deskripsi}</p>
          </div>

          {report.status === "RESOLVED" || report.status === "REJECTED" ? (
            <div
              className={
                report.status === "REJECTED"
                  ? "rounded-card border border-destructive/30 bg-destructive-subdued p-4"
                  : "rounded-card border border-success/30 bg-success-subdued p-4"
              }
            >
              <h3 className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                <ClipboardCheck aria-hidden="true" className="size-4" />
                {report.status === "RESOLVED" ? "Catatan resolusi" : "Catatan penolakan"}
              </h3>
              <p className="text-sm/relaxed text-muted-foreground">
                {report.catatanResolusi ?? "Belum ada catatan."}
              </p>
            </div>
          ) : null}

          {report.status === "IN_PROGRESS" ? (
            <p className="rounded-card border border-status-info-surface bg-status-info-surface p-3.5 text-sm text-status-info-text">
              Laporan Anda sedang ditangani tim fasilitas. Pantau halaman ini untuk pembaruan status.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}