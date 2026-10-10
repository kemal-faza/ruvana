"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { ReportWorkSummaries } from "@/components/staff/report-work-summaries";
import { ReservationSummaryCard } from "@/components/staff/reservation-summary-card";
import { StaffMonthlyRecap } from "@/components/staff/monthly-recap";
import type { StaffReservationSummary } from "@/lib/services/reservation-summary";
import type { StaffMonthlyRecap as RekapBulanan } from "@/lib/services/staff-monthly-recap";
import type { StaffReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface DashboardQueueResponse {
  items: StaffReservationResult[];
  meta: { totalItems: number };
}

interface StaffDashboardProps {
  reservations: StaffReservationResult[];
  totalReservations: number;
  initialError?: boolean;
  ringkasan?: StaffReservationSummary | null;
  ringkasanGagal?: boolean;
  rekap?: RekapBulanan | null;
  rekapBulan?: string;
  rekapPeringatan?: string | null;
  rekapGagal?: boolean;
}

function formatTanggal(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
}

export function StaffDashboard({
  reservations,
  totalReservations,
  initialError = false,
  ringkasan = null,
  ringkasanGagal = false,
  rekap = null,
  rekapBulan = "",
  rekapPeringatan = null,
  rekapGagal = false,
}: StaffDashboardProps) {
  const [items, setItems] = useState(reservations);
  const [total, setTotal] = useState(totalReservations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  async function retryLoad() {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/reservations?page=1&perPage=3");
      if (!response.ok) throw new Error("Gagal memuat antrean.");
      const result = (await response.json()) as DashboardQueueResponse;
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-shell min-w-0 flex-col gap-8 px-4 pt-8 pb-12 sm:gap-10 sm:px-7 sm:pt-12 sm:pb-16 lg:gap-12 lg:pt-section-top">
      <header className="max-w-heading">
        <h1 className="mb-4 text-display-md font-semibold tracking-heading">Dashboard Petugas</h1>
        <p className="text-lede text-muted-foreground sm:text-lede-lg">
          Reservasi dan laporan yang perlu ditangani.
        </p>
      </header>

      <ReservationSummaryCard
        ringkasan={ringkasan}
        gagal={ringkasanGagal}
        onRetry={() => window.location.reload()}
      />

      {rekap ? (
        <StaffMonthlyRecap recap={rekap} currentMonth={rekapBulan} warning={rekapPeringatan} />
      ) : (
        rekapGagal && (
          <section aria-labelledby="rekap-bulanan-gagal-title">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle id="rekap-bulanan-gagal-title" className="text-base">
                  Rekap bulanan
                </CardTitle>
                <CardDescription>
                  Jumlah reservasi per status, per fasilitas, dan 6 bulan terakhir.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3">
                <p role="alert" className="text-sm text-destructive">
                  Gagal memuat rekap bulanan.
                </p>
                <Button
                  type="button"
                  variant="soft"
                  className="min-h-11 gap-2.5 px-4 text-sm"
                  onClick={() => window.location.reload()}
                >
                  Coba lagi
                </Button>
              </CardContent>
            </Card>
          </section>
        )
      )}

      <section aria-labelledby="reservasi-pending-title" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle id="reservasi-pending-title" className="text-base">Menunggu persetujuan</CardTitle>
            <CardDescription>Pengajuan yang menunggu keputusan petugas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-4">
            <p aria-live="polite" className="font-heading text-4xl font-semibold tabular-nums">
              {error ? "—" : total}
              <span className="sr-only"> reservasi menunggu persetujuan</span>
            </p>
            <Button className="min-h-11 gap-2.5 px-4 text-sm" render={<Link href="/petugas/antrian" />}>
              Buka antrean persetujuan
              <ArrowRight aria-hidden="true" data-motion-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Antrean terbaru</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {loading && <p role="status" className="text-sm text-muted-foreground">Memuat antrean…</p>}
            {error && !loading && (
              <div className="flex flex-col items-start gap-3">
                <p role="alert" className="text-sm text-destructive">Gagal memuat antrean reservasi.</p>
                <Button type="button" variant="soft" className="min-h-11" onClick={() => void retryLoad()}>
                  Coba lagi
                </Button>
              </div>
            )}
            {!error && !loading && items.length === 0 && (
              <Empty className="border-0 p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><ClipboardList aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>Belum ada reservasi menunggu.</EmptyTitle>
                  <EmptyContent>
                    <EmptyDescription>Reservasi baru akan muncul di sini setelah diajukan.</EmptyDescription>
                  </EmptyContent>
                </EmptyHeader>
              </Empty>
            )}
            {!error && !loading && items.length > 0 && (
              <ul className="flex min-w-0 flex-col divide-y">
                {items.map((item) => (
                  <li key={item.id} className="min-w-0 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="wrap-break-word text-sm font-medium">
                        {item.facility.nama} · {formatTanggal(item.date)} · {item.startTime}–{item.endTime}
                      </p>
                      <ReservationStatusBadge status={item.status as StatusReservasi} />
                    </div>
                    <p className="mt-1 wrap-break-word text-sm text-muted-foreground">
                      {item.pemohon.nama} · {item.tujuanPenggunaan}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <ReportWorkSummaries />

      <section aria-labelledby="status-fasilitas-title" className="min-w-0 border-t border-border pt-6">
        <h2 id="status-fasilitas-title" className="font-heading text-lg font-semibold tracking-subtitle">
          Status fasilitas
        </h2>
        <Button render={<Link href="/petugas/fasilitas" />} variant="outline" className="mt-4 min-h-11 gap-2.5 px-4 text-sm">
          Kelola fasilitas
          <ArrowRight aria-hidden="true" data-motion-icon="inline-end" />
        </Button>
      </section>
    </main>
  );
}
