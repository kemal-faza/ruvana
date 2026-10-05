"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { INPUT_BASELINE_CLASS, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SELECT_TRIGGER_ACTION_CLASS } from "@/components/ui/select-classes";

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: format(new Date(2020, index, 1), "LLLL", { locale: localeId }),
}));

// Island client kecil untuk pemilih bulan rekap (RES-11). Form tetap form GET
// native dengan atribut action/method dan input tersembunyi `bulan`, jadi nilai
// bulan aktif tetap ikut terkirim walau JavaScript mati (pemilihnya sendiri butuh
// JavaScript karena memakai Select Ruvana, bukan <select> bawaan browser). Dengan
// JavaScript, submit dicegat dan navigasi dilakukan lewat router.replace agar hanya
// Server Component yang me-render ulang: header, sidebar, kartu ringkasan, scroll,
// dan fokus tetap. Validasi ?bulan= dan pengambilan data tetap di server
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
            <Select
              name="bulan"
              items={MONTHS}
              value={month || null}
              disabled={pending}
              required
              modal={false}
              onValueChange={(nilai) => {
                setMonth(nilai ?? "");
                setMenunggu(false);
              }}
            >
              <SelectTrigger
                id="rekap-bulan"
                className={`${SELECT_TRIGGER_ACTION_CLASS} w-full min-w-0`}
              >
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {MONTHS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
