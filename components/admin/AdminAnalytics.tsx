import { STATUS_FASILITAS } from "@/config/business";
import { BADGE_STATUS_FASILITAS, LABEL_STATUS_FASILITAS } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
      <header>
        <p className="mb-1 text-sm font-medium text-primary">Administrasi</p>
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">Analitik</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tinjau penggunaan fasilitas, laporan kerusakan, dan status fasilitas saat ini.
        </p>
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
        <AnalyticsExportActions
          filters={{
            startDate: snapshot.filters.startDate,
            endDate: snapshot.filters.endDate,
            location: snapshot.filters.location ?? "",
          }}
        />
      )}

      {snapshot && (
        <>
          <section aria-label="Ringkasan okupansi" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card size="sm" className="min-w-0">
              <CardContent className="flex h-full flex-col justify-center gap-1">
                <p className="text-xs text-muted-foreground">Okupansi</p>
                <p className="text-2xl font-bold tabular-nums">
                  {snapshot.occupancy.occupancyPercent === null
                    ? "Tidak dapat dihitung"
                    : `${formatPercent(snapshot.occupancy.occupancyPercent)}%`}
                </p>
                {snapshot.occupancy.unavailableReason && (
                  <p className="text-xs text-muted-foreground">{snapshot.occupancy.unavailableReason}</p>
                )}
              </CardContent>
            </Card>
            <MetricCard label="Fasilitas dihitung" value={formatNumber(snapshot.occupancy.facilityCount)} />
            <MetricCard label="Hari kalender" value={formatNumber(snapshot.occupancy.dayCount)} />
            <MetricCard label="Menit reservasi disetujui" value={`${formatNumber(snapshot.occupancy.totalApprovedMinutes)} menit`} />
            <MetricCard label="Kapasitas periode" value={`${formatNumber(snapshot.occupancy.capacityMinutes)} menit`} />
          </section>

          <section aria-label="Metodologi okupansi">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Cara membaca okupansi</CardTitle>
                <CardDescription>
                  Periode {formatCalendarDate(snapshot.filters.startDate)}–{formatCalendarDate(snapshot.filters.endDate)}
                  {snapshot.filters.location ? ` · ${snapshot.filters.location}` : " · Semua lokasi"} · {snapshot.methodology.timezone}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>
                  Kapasitas periode = {formatNumber(snapshot.occupancy.facilityCount)} fasilitas × {formatNumber(snapshot.occupancy.dayCount)} hari × {formatNumber(snapshot.methodology.minutesPerDay)} menit
                  {" = "}{formatNumber(snapshot.occupancy.capacityMinutes)} menit.
                </p>
                <p>
                  {snapshot.methodology.occupancyFormula} {formatNumber(snapshot.occupancy.totalApprovedMinutes)} ÷ {formatNumber(snapshot.occupancy.capacityMinutes)} menit × 100%
                  {snapshot.occupancy.occupancyPercent === null
                    ? " = Tidak dapat dihitung karena kapasitas periode nol."
                    : ` = ${formatPercent(snapshot.occupancy.occupancyPercent)}%.`}
                </p>
                <p>{snapshot.methodology.reservationDateRule}</p>
                <p>{snapshot.methodology.approvedStatusRule}</p>
                <p>{snapshot.methodology.facilityStatusNote}</p>
              </CardContent>
            </Card>
          </section>

          <section aria-label="Rekap laporan kerusakan" className="flex flex-col gap-3">
            <MetricCard label="Total laporan kerusakan" value={`${formatNumber(snapshot.reports.total)} laporan`} />
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Frekuensi laporan kerusakan</CardTitle>
                <CardDescription>{snapshot.methodology.reportCreationDateRule}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-0 sm:p-4 xl:grid-cols-3">
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
              </CardContent>
            </Card>
          </section>

          <section aria-label="Status fasilitas saat ini" className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {STATUS_FASILITAS.map((status) => (
                <MetricCard
                  key={status}
                  label={LABEL_STATUS_FASILITAS[status]}
                  value={formatNumber(snapshot.facilityStatuses[status].length)}
                />
              ))}
            </div>

            <Card className="gap-0 overflow-hidden p-0">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-base">Fasilitas menurut status saat ini</CardTitle>
                <CardDescription>{snapshot.methodology.facilityStatusNote}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table aria-label="Daftar fasilitas menurut status saat ini" className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                        <th scope="col" className="px-4 py-3 font-medium">Status</th>
                        <th scope="col" className="px-4 py-3 font-medium">Fasilitas</th>
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
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardContent className="flex h-full flex-col justify-center gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
