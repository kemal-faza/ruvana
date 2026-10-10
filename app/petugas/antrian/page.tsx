import type { Metadata } from "next";

import { ApprovedReservationList } from "@/components/staff/approved-reservation-list";
import { ReservationQueue } from "@/components/staff/reservation-queue";
import { requirePetugasAtauAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Antrean reservasi | ruvana",
  description: "Setujui atau tolak reservasi menunggu sebagai petugas.",
};

export default async function AntrianPage() {
  // Layout menyiapkan shell; guard ini tetap memastikan hanya petugas/admin yang mengakses halaman.
  await requirePetugasAtauAdmin();

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Antrean reservasi</h1>
      </header>
      <ReservationQueue />
      <section aria-label="Pembatalan mendesak" className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Pembatalan mendesak</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Alasan wajib diisi dan akan terlihat oleh pemohon.
          </p>
        </header>
        <ApprovedReservationList />
      </section>
    </main>
  );
}
