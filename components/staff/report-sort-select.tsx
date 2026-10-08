"use client";

import { useRouter } from "next/navigation";
import { cn } from "cn";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_TRIGGER_ACTION_CLASS } from "@/components/ui/select-classes";
import {
  URUTAN_LAPORAN,
  URUTAN_LAPORAN_BAWAAN,
  type AntreanLaporan,
  type UrutanLaporan,
} from "@/lib/validation/report-processing";

const LABEL_URUTAN: Record<UrutanLaporan, string> = {
  terlama: "Terlama",
  terbaru: "Terbaru",
};

const OPSI_URUTAN = URUTAN_LAPORAN.map((urut) => ({ value: urut, label: LABEL_URUTAN[urut] }));

function isUrutanLaporan(nilai: unknown): nilai is UrutanLaporan {
  return (URUTAN_LAPORAN as readonly unknown[]).includes(nilai);
}

// Bentuk URL disalin dari app/petugas/laporan/page.tsx agar urutan bawaan
// tetap tanpa `sort`: memindahkan tautan ke dalam satu kontrol tidak boleh
// mengubah alamat yang ditandai, disalin, atau dibaca pengguna.
function hrefUrut(queue: AntreanLaporan, urut: UrutanLaporan): string {
  return urut === URUTAN_LAPORAN_BAWAAN
    ? `/petugas/laporan?queue=${queue}`
    : `/petugas/laporan?queue=${queue}&sort=${urut}`;
}

// Dua tautan urutan digantikan satu dropdown Base UI yang menampilkan
// pilihan saat dibuka. Urutan aktif tetap dibaca dari URL (Server
// Component) supaya bawaan "Terlama" dan pilihan pengguna bertahan
// saat halaman dimuat ulang atau disalin.
export function ReportSortSelect({ queue, urut }: { queue: AntreanLaporan; urut: UrutanLaporan }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Urutkan</span>
      <Select
        items={OPSI_URUTAN}
        value={urut}
        // `modal={false}` mencegah Base UI mengunci scroll halaman saat
        // popup dibuka; konsisten dengan Select lain di aplikasi ini.
        modal={false}
        onValueChange={(value) => {
          if (!isUrutanLaporan(value) || value === urut) return;
          router.replace(hrefUrut(queue, value), { scroll: false });
        }}
      >
        <SelectTrigger
          aria-label="Urutkan antrean laporan"
          className={cn(
            SELECT_TRIGGER_ACTION_CLASS,
            // Hijau muda yang sama dengan item sidebar "Laporan kerusakan"
            // (`#edf1e2`), termasuk chevron agar teks tetap terbaca.
            "shrink-0 bg-primary-subdued text-primary-subdued-foreground hover:bg-primary-subdued/80 [&_svg]:text-primary-subdued-foreground dark:bg-primary-subdued dark:text-primary-subdued-foreground dark:hover:bg-primary-subdued/80",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {OPSI_URUTAN.map((opsi) => (
            <SelectItem key={opsi.value} value={opsi.value}>
              {opsi.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
