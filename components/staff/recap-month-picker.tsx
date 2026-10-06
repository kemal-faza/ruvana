"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { INPUT_BASELINE_CLASS, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: format(new Date(2020, index, 1), "LLLL", { locale: localeId }),
}));

// Island client kecil untuk pemilih bulan rekap (RES-11). Atribut native
// action/method dipertahankan sehingga tanpa JavaScript form GET tetap
// berfungsi (reload penuh). Dengan JavaScript, submit dicegat dan navigasi
// dilakukan lewat router.replace agar hanya Server Component yang
// me-render ulang: header, sidebar, kartu ringkasan, scroll, dan fokus
// tetap. Validasi ?bulan= dan pengambilan data tetap di server
// (app/petugas/page.tsx); client hanya meneruskan string bulan.
export function RecapMonthPicker({ currentMonth }: { currentMonth: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [initialYear, initialMonth] = currentMonth.split("-");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const nilai = /^\d{4}$/.test(year) && month ? `${year}-${month}` : "";
  // Penanda terkirim: true sejak submit sampai server mengembalikan
  // currentMonth baru. Membuat status pending deterministik (tidak
  // bergantung pada timing transisi) dan mencegah dobel-submit.
  const [menunggu, setMenunggu] = useState(false);
  const pending = isPending || menunggu;

  // Sinkronisasi dari server: saat currentMonth baru tiba (navigasi
  // selesai), selaraskan input dan hapus penanda pending. Penyesuaian
  // state saat render untuk menyimpan informasi dari render sebelumnya.
  const [bulanTampil, setBulanTampil] = useState(currentMonth);
  if (bulanTampil !== currentMonth) {
    setBulanTampil(currentMonth);
    const [tahunBaru, bulanBaru] = currentMonth.split("-");
    setYear(tahunBaru);
    setMonth(bulanBaru);
    setMenunggu(false);
  }

  function onSubmit(event: React.FormEvent) {
    // Cegah navigasi penuh; gantikan dengan navigasi parsial client.
    event.preventDefault();
    if (menunggu || !nilai || nilai === currentMonth) return;
    setMenunggu(true);
    startTransition(() => {
      router.replace(`/petugas?bulan=${nilai}`, { scroll: false });
    });
  }

  return (
    <>
      <form
        aria-label="Pilih bulan rekap"
        aria-busy={pending || undefined}
        action="/petugas"
        method="get"
        onSubmit={onSubmit}
        className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="rekap-bulan">Bulan</Label>
            <select
              id="rekap-bulan"
              name="bulan"
              value={month}
              disabled={pending}
              required
              onChange={(event) => {
                setMonth(event.target.value);
                setMenunggu(false);
              }}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80"
            >
              {MONTHS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="rekap-tahun">Tahun</Label>
            <Input
              id="rekap-tahun"
              name="tahun"
              type="number"
              min={1}
              max={9999}
              value={year}
              disabled={pending}
              required
              onChange={(event) => {
                setYear(event.target.value);
                setMenunggu(false);
              }}
              className={INPUT_BASELINE_CLASS}
            />
          </div>
        </div>
        <Button type="submit" disabled={pending || !nilai} className={`${BUTTON_ACTION_CLASS} sm:w-auto`}>
          Tampilkan rekap
        </Button>
      </form>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat rekap…
        </p>
      )}
    </>
  );
}
