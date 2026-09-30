import { BADGE_STATUS_RESERVASI } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import type { StaffMonthlyRecap as RekapBulanan } from "@/lib/services/staff-monthly-recap";

const numberFormatter = new Intl.NumberFormat("id-ID");

function kalimatRingkasan(rekap: RekapBulanan): string {
  if (rekap.total === 0) {
    return `Pada ${rekap.monthLabel} belum ada reservasi yang memakai fasilitas.`;
  }
  const rincian = rekap.perStatus
    .map((item) => `${numberFormatter.format(item.count)} ${item.label.toLowerCase()}`)
    .join(", ")
    .replace(/, ([^,]*)$/, ", dan $1");
  return `Pada ${rekap.monthLabel} terdapat ${numberFormatter.format(rekap.total)} reservasi: ${rincian}.`;
}

export function StaffMonthlyRecap({
  recap,
  currentMonth,
  warning,
}: {
  recap: RekapBulanan;
  currentMonth: string;
  warning: string | null;
}) {
  return (
    <section aria-labelledby="rekap-bulanan-title" className="min-w-0">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle id="rekap-bulanan-title" className="text-base">
            Rekap bulanan
          </CardTitle>
          <CardDescription>
            Jumlah reservasi per status, per fasilitas, dan 6 bulan terakhir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-6">
          <form aria-label="Pilih bulan rekap" action="/petugas" method="get" className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="rekap-bulan">Bulan</Label>
              <Input
                id="rekap-bulan"
                name="bulan"
                type="month"
                defaultValue={currentMonth}
                className="min-h-11"
              />
            </div>
            <Button type="submit" className="min-h-11 gap-2.5 px-4 text-sm sm:w-auto">
              Tampilkan rekap
            </Button>
          </form>
          {warning && (
            <p role="status" className="text-sm text-muted-foreground">
              {warning}
            </p>
          )}

          <p aria-live="polite" className="text-sm text-muted-foreground">
            {kalimatRingkasan(recap)}
          </p>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold">Jumlah reservasi per status</h3>
              <div className="overflow-x-auto rounded-control border border-border">
                <table aria-label="Jumlah reservasi per status" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recap.perStatus.map((item) => (
                      <tr key={item.status} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <ReservationStatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {numberFormatter.format(item.count)}
                          <span className="sr-only"> reservasi {item.label.toLowerCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold">Jumlah reservasi per fasilitas</h3>
              <div className="overflow-x-auto rounded-control border border-border">
                <table aria-label="Jumlah reservasi per fasilitas" className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">Fasilitas</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recap.perFacility.length > 0 ? (
                      recap.perFacility.map((item) => (
                        <tr key={item.facilityId} className="border-b border-border/60 last:border-0">
                          <td className="wrap-break-word px-4 py-3 font-medium">{item.facilityName}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {numberFormatter.format(item.count)}
                            <span className="sr-only"> reservasi</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                          Belum ada reservasi pada bulan ini. Reservasi baru akan muncul di sini
                          setelah diajukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="mb-2 text-sm font-semibold">Jumlah reservasi 6 bulan terakhir</h3>
            <div className="overflow-x-auto rounded-control border border-border">
              <table aria-label="Jumlah reservasi 6 bulan terakhir" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Bulan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Periode</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.trend.map((item) => (
                    <tr key={item.month} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {item.label}
                        {item.month === recap.month && (
                          <Badge variant={BADGE_STATUS_RESERVASI.APPROVED} className="ml-2">
                            Bulan ini
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{item.month}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {numberFormatter.format(item.count)} reservasi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">Metodologi</h3>
            <ul className="flex min-w-0 list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              <li>Dihitung berdasarkan tanggal pemakaian (Asia/Jakarta), bukan waktu pengajuan.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
