import { Building2, ClipboardList, Inbox, LayoutDashboard } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import type { NavigationGroup } from "@/components/app-shell/types";
import { ApprovedReservationList } from "@/components/staff/approved-reservation-list";
import { ReservationQueue } from "@/components/staff/reservation-queue";

export const dynamic = "force-dynamic";

const navigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "ringkasan", label: "Ringkasan", href: "/", icon: LayoutDashboard },
      { key: "antrian", label: "Antrean", href: "/petugas/antrian", icon: Inbox },
      { key: "fasilitas", label: "Fasilitas", href: "/fasilitas", icon: Building2 },
      { key: "laporan", label: "Laporan", href: "/laporan", icon: ClipboardList },
    ],
  },
];

export default function AntrianPage() {
  return (
    <AppShell navigation={navigation} account={{ displayName: "Petugas Ruvana", roleLabel: "Petugas" }}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary">Petugas</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Antrean reservasi</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Reservasi menunggu yang belum diproses. Setujui atau tolak dengan alasan.
          </p>
        </header>
        <ReservationQueue />
        <section aria-label="Pembatalan mendesak" className="flex flex-col gap-4">
          <header className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Pembatalan mendesak</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Batalkan reservasi yang sudah disetujui untuk kondisi mendesak. Alasan wajib diisi dan terlihat oleh
              pemilik reservasi.
            </p>
          </header>
          <ApprovedReservationList />
        </section>
      </main>
    </AppShell>
  );
}
