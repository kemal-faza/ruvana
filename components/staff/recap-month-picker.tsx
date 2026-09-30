"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [nilai, setNilai] = useState(currentMonth);
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
    setNilai(currentMonth);
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
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="rekap-bulan">Bulan</Label>
          <Input
            id="rekap-bulan"
            name="bulan"
            type="month"
            value={nilai}
            disabled={pending}
            onChange={(event) => {
              setNilai(event.target.value);
              setMenunggu(false);
            }}
            className="min-h-11"
          />
        </div>
        <Button type="submit" disabled={pending} className="min-h-11 gap-2.5 px-4 text-sm sm:w-auto">
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
