"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffReservationSummary } from "@/lib/services/reservation-summary";

interface ReservationSummaryCardProps {
  ringkasan: StaffReservationSummary | null;
  loading?: boolean;
  gagal?: boolean;
  onRetry?: () => void;
}

const KELOMPOK: Array<{
  kunci: "menunggu" | "disetujui" | "ditolak" | "lainnya";
  label: string;
  variant: "pending" | "success" | "danger" | "neutral";
  keterangan: string;
}> = [
  { kunci: "menunggu", label: "Menunggu", variant: "pending", keterangan: "Belum diproses petugas." },
  { kunci: "disetujui", label: "Disetujui", variant: "success", keterangan: "Telah disetujui petugas." },
  { kunci: "ditolak", label: "Ditolak", variant: "danger", keterangan: "Ditolak petugas." },
  { kunci: "lainnya", label: "Lainnya", variant: "neutral", keterangan: "Dibatalkan atau kedaluwarsa." },
];

export function ReservationSummaryCard({
  ringkasan,
  loading = false,
  gagal = false,
  onRetry,
}: ReservationSummaryCardProps) {
  if (!ringkasan && !loading && !gagal) return null;

  return (
    <section aria-labelledby="ringkasan-reservasi-title">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle id="ringkasan-reservasi-title" className="text-base">
            Ringkasan reservasi
          </CardTitle>
          <CardDescription>Jumlah reservasi per kelompok status.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {loading && (
            <div role="status" aria-busy="true" className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <p className="sr-only">Memuat ringkasan reservasi</p>
            </div>
          )}
          {gagal && !loading && (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm text-destructive">
                Gagal memuat ringkasan reservasi.
              </p>
              <Button
                type="button"
                variant="soft"
                className="min-h-11 gap-2.5 px-4 text-sm"
                onClick={onRetry}
              >
                Coba lagi
              </Button>
            </div>
          )}
          {!loading && !gagal && ringkasan && (
            <>
              <dl aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {KELOMPOK.map((item) => (
                  <div
                    key={item.kunci}
                    className="flex min-w-0 flex-col gap-1.5 rounded-control border border-border bg-muted p-3"
                  >
                    <dt>
                      <Badge variant={item.variant}>{item.label}</Badge>
                    </dt>
                    <dd className="flex flex-col gap-1">
                      <p className="font-heading text-2xl font-semibold tabular-nums">
                        {ringkasan[item.kunci]}
                        <span className="sr-only"> reservasi {item.label.toLowerCase()}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{item.keterangan}</p>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="info">Sedang berlangsung</Badge>
                <p className="text-muted-foreground">
                  {ringkasan.sedangBerlangsung} dari {ringkasan.disetujui} reservasi disetujui
                  sedang berlangsung.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Total reservasi{" "}
                  <span className="font-heading text-xl font-semibold text-foreground tabular-nums">
                    {ringkasan.total}
                  </span>
                </p>
                <Button className="min-h-11 gap-2.5 px-4 text-sm" render={<Link href="/petugas/antrian" />}>
                  Buka Persetujuan Reservasi
                  <ArrowRight aria-hidden="true" data-motion-icon="inline-end" />
                </Button>
              </div>
              {ringkasan.total === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada reservasi yang tercatat.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
