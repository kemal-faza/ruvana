import type { ReactNode } from "react";

import { STATUS_FASILITAS } from "@/config/business";
import { BADGE_STATUS_FASILITAS, LABEL_STATUS_FASILITAS } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnalyticsExportActions from "@/components/admin/AnalyticsExportActions";
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

function formatTimestamp(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(value);
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <dt className="min-w-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Rule({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
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
  const facilityRows = snapshot
    ? STATUS_FASILITAS.flatMap((status) =>
        snapshot.facilityStatuses[status].map((nama) => ({ status, nama })),
      )
    : [];
  const selectedLocationUnavailable =
    locations.length > 0 && filters.location !== "" && !locations.includes(filters.location);

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-primary">Administrasi</p>
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">Analitik</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tinjau penggunaan fasilitas, laporan kerusakan, dan status fasilitas saat ini.
          </p>
          {snapshot && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCalendarDate(snapshot.filters.startDate)} – {formatCalendarDate(snapshot.filters.endDate)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{snapshot.filters.location ?? "Semua lokasi"}</span>
              <span aria-hidden="true">·</span>
              <span>Dihitung {formatTimestamp(snapshot.metadata.generatedAt, snapshot.methodology.timezone)}</span>
            </p>
          )}
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

      <section aria-label="Filter analitik">
        <Card size="sm">
          <CardContent>
            <form action="/admin/analitik" method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                <span>Tanggal awal</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={filters.startDate}
                  className="h-10 min-w-0 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Tanggal awal"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                <span>Tanggal akhir</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={filters.endDate}
                  className="h-10 min-w-0 rounded-lg border border-input bg-transparent px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Tanggal akhir"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                <span>Lokasi</span>
                <select
                  name="location"
                  defaultValue={filters.location}
                  aria-label="Lokasi"
                  className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Semua lokasi</option>
                  {selectedLocationUnavailable && (
                    <option value={filters.location}>Lokasi tidak tersedia: {filters.location}</option>
                  )}
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="min-h-10 w-full sm:col-span-2 xl:col-span-1">
                Terapkan filter
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Filter tidak valid.</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((error, index) => (
              <li key={`${error.field}-${error.code}-${index}`}>
                <span className="font-medium">{error.field}:</span> {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  {snapshot.occupancy.occupancyPercent !== null && (
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(snapshot.occupancy.totalApprovedMinutes)} menit ÷ {formatNumber(snapshot.occupancy.capacityMinutes)} menit × 100%
                    </p>
                  )}
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
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-semibold tracking-tight">Laporan kerusakan</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Laporan yang dibuat pada periode dan lokasi terpilih, dikelompokkan per fasilitas, kategori, dan status.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Total{" "}
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {formatNumber(snapshot.reports.total)} laporan
                </span>
              </p>
            </div>

            <div className="grid min-w-0 gap-3 xl:grid-cols-3">
              <AnalyticsReportBreakdownTable
                key={`fasilitas-${snapshot.metadata.generatedAt.toISOString()}`}
                title="Laporan menurut fasilitas"
                ariaLabel="Laporan menurut fasilitas"
                rows={snapshot.reports.byFacility}
              />
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
          </section>

          <section aria-label="Status fasilitas saat ini" className="flex flex-col gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold tracking-tight">Status fasilitas</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">{snapshot.methodology.facilityStatusNote}</p>
            </div>

            <Card className="gap-0 overflow-hidden p-0">
              <div className="grid divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {STATUS_FASILITAS.map((status) => (
                  <div key={status} className="flex items-center gap-2.5 px-4 py-3">
                    <Badge variant={BADGE_STATUS_FASILITAS[status]}>{LABEL_STATUS_FASILITAS[status]}</Badge>
                    <span className="text-xl font-bold tabular-nums">
                      {formatNumber(snapshot.facilityStatuses[status].length)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table aria-label="Daftar fasilitas menurut status saat ini" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Fasilitas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilityRows.length > 0 ? (
                      facilityRows.map(({ status, nama }) => (
                        <tr key={`${status}-${nama}`} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3 align-top">
                            <Badge variant={BADGE_STATUS_FASILITAS[status]}>{LABEL_STATUS_FASILITAS[status]}</Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{nama}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                          Tidak ada fasilitas untuk lokasi ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section aria-label="Metodologi perhitungan" className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Metodologi perhitungan</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
              <Rule term="Zona waktu">
                {snapshot.methodology.timezone} · {formatNumber(snapshot.methodology.minutesPerDay)} menit operasional per hari
              </Rule>
              <Rule term="Kapasitas periode">{snapshot.methodology.capacityFormula}</Rule>
              <Rule term="Rumus okupansi">{snapshot.methodology.occupancyFormula}</Rule>
              <Rule term="Tanggal reservasi">{snapshot.methodology.reservationDateRule}</Rule>
              <Rule term="Status dihitung">{snapshot.methodology.approvedStatusRule}</Rule>
              <Rule term="Rentang laporan">{snapshot.methodology.reportCreationDateRule}</Rule>
              <Rule term="Status fasilitas">{snapshot.methodology.facilityStatusNote}</Rule>
            </dl>
          </section>
        </>
      )}
    </main>
  );
}
