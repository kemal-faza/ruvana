import { Building2, CalendarDays, ClipboardList, LayoutDashboard, Settings } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import type { NavigationGroup } from "@/components/app-shell/types";
import { ReservationForm } from "@/components/reservation/reservation-form";
import { listPublicFacilities } from "@/lib/services/facility-service";

export const dynamic = "force-dynamic";

const navigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "ringkasan", label: "Ringkasan", href: "/", icon: LayoutDashboard },
      { key: "reservasi", label: "Reservasi", href: "/reservasi", icon: CalendarDays },
      { key: "fasilitas", label: "Fasilitas", href: "/fasilitas", icon: Building2 },
      { key: "laporan", label: "Laporan", href: "/laporan", icon: ClipboardList },
    ],
  },
  {
    key: "sistem",
    label: "Sistem",
    items: [{ key: "pengaturan", label: "Pengaturan", href: "/pengaturan", icon: Settings }],
  },
];

async function getFacilities() {
  // Sumber data asli Modul 2 (fasilitas): ambil daftar publik lalu saring yang ACTIVE untuk dropdown reservasi
  const { items } = await listPublicFacilities({ page: 1, perPage: 500 });
  return items
    .filter((facility) => facility.status === "ACTIVE")
    .map((facility) => ({ id: facility.id, nama: facility.nama, lokasi: facility.lokasi }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export default async function ReservasiPage() {
  const facilities = await getFacilities();

  return (
    <AppShell navigation={navigation} account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }} logoutDestination="/keluar">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary">Reservasi</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ajukan reservasi</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Lengkapi detail reservasi untuk mengajukan peminjaman fasilitas.</p>
        </header>
        <ReservationForm facilities={facilities} />
      </main>
    </AppShell>
  );
}
