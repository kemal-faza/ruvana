import Link from "next/link";

import { STATUS_FASILITAS } from "@/config/business";
import { BADGE_STATUS_FASILITAS, LABEL_STATUS_FASILITAS } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnalyticsExportActions from "@/components/admin/AnalyticsExportActions";
import AnalyticsFilterPanel from "@/components/admin/AnalyticsFilterPanel";
import AnalyticsReportBreakdownTable from "@/components/admin/AnalyticsReportBreakdownTable";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";
import type { AnalyticsFilterValues } from "@/lib/validation/admin-analytics";
import type { ProblemFieldError } from "@/lib/http/problem";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <dt className="min-w-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export default function AdminAnalyticsDashboard({
  filters,
  locations,
  snapshot,
  errors,
}: {
  filters: AnalyticsFilterValues;
  locations: string[];
  snapshot: AnalyticsSnapshot | null;
  errors: ProblemFieldError[];
}) {
  const facilityCount = snapshot
    ? STATUS_FASILITAS.reduce((total, status) => total + snapshot.facilityStatuses[status].length, 0)
    : 0;
  const selectedLocationUnavailable =
    locations.length > 0 && filters.location !== "" && !locations.includes(filters.location);
  const periodLabel = snapshot
    ? `${formatCalendarDate(snapshot.filters.startDate)} – ${formatCalendarDate(snapshot.filters.endDate)}`
    : `${filters.startDate} – ${filters.endDate}`;
  const locationLabel = filters.location || "Semua lokasi";

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-primary">Administrasi</p>
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">Analitik</h1>
        </div>

        {snapshot && (
          <AnalyticsExportActions
            filters={{
              startDate: snapshot.filters.startDate,
              endDate: snapshot.filters.endDate,
              location: snapshot.filters.location ?? "",
            }}
          />
        )}
      </header>

      <section aria-label="Filter analitik" className="flex flex-col gap-3">
        {errors.length > 0 && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0">
              <p className="font-medium">Filter tidak valid.</p>
              <ul className="mt-1 list-inside list-disc">
                {errors.map((error, index) => (
                  <li key={`${error.field}-${error.code}-${index}`}>{error.message}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              className="min-h-11 shrink-0 self-start text-foreground sm:self-auto"
              nativeButton={false}
              render={<Link href="/admin/analitik" />}
            >
              Pakai rentang bulan ini
            </Button>
          </div>
        )}

        <AnalyticsFilterPanel
          startDate={filters.startDate}
          endDate={filters.endDate}
          location={filters.location}
          locations={locations}
          selectedLocationUnavailable={selectedLocationUnavailable}
          periodLabel={periodLabel}
          locationLabel={locationLabel}
          startExpanded={errors.length > 0}
        />
      </section>

      {snapshot && (
        <>
          <section aria-label="Ringkasan okupansi" className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Okupansi</h2>

            <Card size="sm">
              <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,9fr)] lg:items-center lg:gap-10">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-xs text-muted-foreground">Okupansi periode terpilih</p>
                  <p
                    className={`font-bold tabular-nums ${
                      snapshot.occupancy.occupancyPercent === null ? "text-xl" : "text-4xl"
                    }`}
                  >
                    {snapshot.occupancy.occupancyPercent === null
                      ? "Tidak dapat dihitung"
                      : `${formatPercent(snapshot.occupancy.occupancyPercent)}%`}
                  </p>
                  {snapshot.occupancy.unavailableReason && (
                    <p className="text-xs text-muted-foreground">{snapshot.occupancy.unavailableReason}</p>
                  )}
                </div>

                <dl className="flex min-w-0 flex-col">
                  <Figure
                    label="Menit reservasi disetujui"
                    value={`${formatNumber(snapshot.occupancy.totalApprovedMinutes)} menit`}
                  />
                  <Figure
                    label="Kapasitas periode"
                    value={`${formatNumber(snapshot.occupancy.capacityMinutes)} menit`}
                  />
                  <Figure label="Fasilitas dihitung" value={formatNumber(snapshot.occupancy.facilityCount)} />
                  <Figure label="Hari kalender" value={formatNumber(snapshot.occupancy.dayCount)} />
                </dl>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Rekap laporan kerusakan" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <h2 className="font-heading text-lg font-semibold tracking-tight">Laporan kerusakan</h2>
              <dl className="shrink-0">
                <dt className="text-xs text-muted-foreground">Total periode ini</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatNumber(snapshot.reports.total)} laporan
                </dd>
              </dl>
            </div>

            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
              <AnalyticsReportBreakdownTable
                key={`fasilitas-${snapshot.metadata.generatedAt.toISOString()}`}
                title="Laporan menurut fasilitas"
                ariaLabel="Laporan menurut fasilitas"
                rows={snapshot.reports.byFacility}
              />
              <div className="grid min-w-0 content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <AnalyticsReportBreakdownTable
                  key={`kategori-${snapshot.metadata.generatedAt.toISOString()}`}
                  title="Laporan menurut kategori"
                  ariaLabel="Laporan menurut kategori"
                  rows={snapshot.reports.byCategory}
                />
                <AnalyticsReportBreakdownTable
                  key={`status-${snapshot.metadata.generatedAt.toISOString()}`}
                  title="Laporan menurut status"
                  ariaLabel="Laporan menurut status"
                  rows={snapshot.reports.byStatus}
                />
              </div>
            </div>
          </section>

          <section aria-label="Status fasilitas saat ini" className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Status fasilitas</h2>

            {facilityCount > 0 ? (
              <Card className="gap-0 overflow-hidden p-0">
                <ul className="grid divide-y divide-border/60 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                  {STATUS_FASILITAS.map((status) => {
                    const namaFasilitas = snapshot.facilityStatuses[status];
                    return (
                      <li key={status} className="flex min-w-0 flex-col gap-3 p-4">
                        <Badge variant={BADGE_STATUS_FASILITAS[status]}>{LABEL_STATUS_FASILITAS[status]}</Badge>
                        <p className="text-sm text-muted-foreground">
                          <span className="text-xl font-semibold tabular-nums text-foreground">
                            {formatNumber(namaFasilitas.length)}
                          </span>{" "}
                          fasilitas
                        </p>
                        {namaFasilitas.length > 0 && (
                          <ul
                            aria-label={`Daftar fasilitas berstatus ${LABEL_STATUS_FASILITAS[status]}`}
                            className="flex flex-wrap gap-1.5"
                          >
                            {namaFasilitas.map((nama) => (
                              <li
                                key={nama}
                                className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium"
                              >
                                {nama}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : (
              <Card className="gap-0 p-4">
                <p className="text-sm text-muted-foreground">Tidak ada fasilitas untuk lokasi ini.</p>
              </Card>
            )}
          </section>
        </>
      )}
    </main>
  );
}
