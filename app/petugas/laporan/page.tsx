import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";

import { ReportQueue } from "@/components/staff/report-queue";
import { ReportSortSelect } from "@/components/staff/report-sort-select";
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { requirePetugasAtauAdmin } from "@/lib/auth";
import {
  ANTREAN_LAPORAN,
  hrefAntreanLaporan,
  parseAntreanDanUrutan,
  type AntreanLaporan,
} from "@/lib/validation/report-processing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan kerusakan | ruvana",
  description: "Proses laporan kerusakan yang masuk dan pekerjaan yang sedang berjalan.",
};

const LABEL_ANTREAN: Record<AntreanLaporan, string> = {
  intake: "Laporan masuk",
  work: "Daftar pekerjaan",
  riwayat: "Riwayat",
};

export default async function PetugasLaporanPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout menyiapkan shell; guard ini tetap memastikan hanya petugas/admin yang mengakses halaman.
  await requirePetugasAtauAdmin();

  // Antrean dan urutan dibaca dari URL agar pilihan bertahan saat halaman
  // disalin atau dimuat ulang; nilai lain jatuh ke bawaan antrean masuk.
  const { queue, urut } = parseAntreanDanUrutan((await searchParams) ?? {});

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Laporan kerusakan</h1>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Pilih antrean laporan" className="flex flex-wrap gap-2">
          {ANTREAN_LAPORAN.map((item) => {
            const selected = queue === item;
            return (
              <Button
                key={item}
                render={<Link href={hrefAntreanLaporan(item, urut)} />}
                variant={selected ? "primary" : "outline"}
                aria-current={selected ? "page" : undefined}
                className={cn(BUTTON_ACTION_CLASS, !selected && "text-muted-foreground hover:text-foreground")}
              >
                {LABEL_ANTREAN[item]}
              </Button>
            );
          })}
        </nav>

        <ReportSortSelect queue={queue} urut={urut} />
      </div>

      <ReportQueue queue={queue} urut={urut} />
    </main>
  );
}
