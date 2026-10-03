import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";

import { ReportQueue } from "@/components/staff/report-queue";
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { requirePetugasAtauAdmin } from "@/lib/auth";
import type { AntreanLaporan } from "@/lib/validation/report-processing";
import { ANTREAN_LAPORAN } from "@/lib/validation/report-processing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan kerusakan | ruvana",
  description: "Proses laporan kerusakan yang masuk dan pekerjaan yang sedang berjalan.",
};

/** Nilai antrean di URL dari ringkasan dasbor; nilai lain jatuh ke intake. */
function parseAntrean(raw: string | string[] | undefined): AntreanLaporan {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (ANTREAN_LAPORAN as readonly string[]).includes(value ?? "")
    ? (value as AntreanLaporan)
    : "intake";
}

export default async function PetugasLaporanPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Layout menyiapkan shell; guard ini tetap memastikan hanya petugas/admin yang mengakses halaman.
  await requirePetugasAtauAdmin();

  const antrean = parseAntrean((await searchParams)?.queue);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary">Petugas</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Laporan kerusakan</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Antrean masuk hanya memuat laporan baru. Daftar pekerjaan juga memuat laporan yang sedang ditangani agar
          pekerjaan berjalan tetap dapat diselesaikan.
        </p>
      </header>

      <nav aria-label="Pilih antrean laporan" className="flex flex-wrap gap-2">
        {ANTREAN_LAPORAN.map((item) => {
          const selected = antrean === item;
          return (
            <Button
              key={item}
              render={<Link href={`/petugas/laporan?queue=${item}`} />}
              variant={selected ? "primary" : "outline"}
              aria-current={selected ? "page" : undefined}
              className={cn(BUTTON_ACTION_CLASS, !selected && "text-muted-foreground hover:text-foreground")}
            >
              {item === "intake" ? "Laporan masuk" : "Daftar pekerjaan"}
            </Button>
          );
        })}
      </nav>

      <ReportQueue queue={antrean} />
    </main>
  );
}