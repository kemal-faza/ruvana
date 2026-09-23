import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationHistoryList } from "@/components/reservation/reservation-history-list";
import { reservasiNavigation } from "../navigation";

export const dynamic = "force-dynamic";

export default function RiwayatReservasiPage() {
  return (
    <AppShell navigation={reservasiNavigation} account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }} logoutDestination="/keluar">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
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
