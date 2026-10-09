import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationHistoryList } from "@/components/reservation/reservation-history-list";
import { reservasiNavigation } from "../navigation";
import { shellAccountFromUser } from "@/config/navigation";
import { requirePengguna } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservasi Saya | ruvana",
  description: "Lihat status dan detail seluruh reservasi milik Anda.",
};

export default async function RiwayatReservasiPage() {
  // Guard server (IAM-03): tanpa sesi ke /login, role lain ke /403.
  // Riwayat dibaca komponen klien lewat API milik pengguna.
  const pengguna = await requirePengguna();
  const account = shellAccountFromUser(pengguna);

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary">Reservasi</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Reservasi Saya</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Riwayat reservasi milik Anda dalam semua status. Pilih salah satu untuk melihat detail lengkap.
          </p>
        </header>
        <ReservationHistoryList />
      </main>
    </AppShell>
  );
}
