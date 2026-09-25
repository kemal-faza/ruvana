"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  STATUS_LAPORAN_BARU,
  STATUS_LAPORAN_DIPROSES,
  STATUS_LAPORAN_KERJA_PETUGAS,
} from "@/config/business";
import type { StaffReportWorkStatus, StaffReportWorkView } from "@/lib/services/report-service";

const RINGKASAN_STATUS: Record<
  StaffReportWorkStatus,
  { title: string; description: string; empty: string; linkText: string }
> = {
  [STATUS_LAPORAN_BARU]: {
    title: "Laporan baru",
    description: "Laporan yang menunggu penanganan.",
    empty: "Belum ada laporan baru.",
    linkText: "Lihat laporan baru",
  },
  [STATUS_LAPORAN_DIPROSES]: {
    title: "Sedang dikerjakan",
    description: "Laporan yang sudah mulai ditangani.",
    empty: "Belum ada laporan yang sedang dikerjakan.",
    linkText: "Lihat pekerjaan berjalan",
  },
};

const SUMMARIES = STATUS_LAPORAN_KERJA_PETUGAS.map((status) => ({ status, ...RINGKASAN_STATUS[status] }));

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

async function requestSummary(): Promise<StaffReportWorkView> {
  const response = await fetch("/api/staff/reports");
  if (!response.ok) throw new Error("Gagal memuat ringkasan laporan.");
  return (await response.json()) as StaffReportWorkView;
}

function formatTanggal(value: string): string {
  return FORMAT_TANGGAL.format(new Date(value));
}

export function ReportWorkSummaries() {
  const [summary, setSummary] = useState<StaffReportWorkView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void requestSummary()
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch(() => {
        if (active) {
          setSummary(null);
          setError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function retryLoad() {
    setLoading(true);
    setError(false);
    try {
      setSummary(await requestSummary());
    } catch {
      setSummary(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="ringkasan-laporan-title" className="flex min-w-0 flex-col gap-4">
      <header>
        <h2 id="ringkasan-laporan-title" className="font-heading text-lg font-semibold tracking-tight">
          Laporan kerusakan
        </h2>
        <p className="text-sm text-muted-foreground">Pekerjaan aktif dari seluruh pelapor.</p>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {SUMMARIES.map((item) => {
          const work = summary?.[item.status];
          return (
            <Card key={item.status} className="min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{item.title}</h3>
                  {!loading && !error && <span className="font-heading text-2xl font-semibold tabular-nums">{work?.total}</span>}
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-col gap-4">
                {loading && <p role="status" className="text-sm text-muted-foreground">Memuat ringkasan laporan…</p>}
                {error && !loading && (
                  <div className="flex flex-col items-start gap-3">
                    <p role="alert" className="text-sm text-destructive">Gagal memuat ringkasan laporan.</p>
                    <Button type="button" variant="outline" className="min-h-11 gap-2.5 px-4 text-sm" onClick={() => void retryLoad()}>
                      Coba lagi
                    </Button>
                  </div>
                )}
                {!loading && !error && work?.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">{item.empty}</p>
                )}
                {!loading && !error && work && work.items.length > 0 && (
                  <ul className="flex min-w-0 flex-col divide-y">
                    {work.items.map((report) => (
                      <li key={report.id} className="min-w-0 py-3 first:pt-0 last:pb-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <ReportStatusBadge status={report.status} />
                          <span className="text-xs text-muted-foreground">{report.kategori}</span>
                        </div>
                        <p className="wrap-break-word text-sm font-medium">{report.facilityNama}</p>
                        <p className="line-clamp-2 wrap-break-word text-sm text-muted-foreground">{report.deskripsi}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatTanggal(report.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button render={<Link href={`/petugas/laporan?status=${item.status}`} />} variant="outline" className="min-h-11 self-start gap-2.5 px-4 text-sm">
                  {item.linkText}
                  <ArrowRight aria-hidden="true" data-motion-icon="inline-end" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
