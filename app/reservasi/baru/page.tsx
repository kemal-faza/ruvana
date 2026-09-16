import { Building2, CalendarDays, ClipboardList, LayoutDashboard, Settings } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import type { NavigationGroup } from "@/components/app-shell/types";
import { ReservationForm } from "@/components/reservation/reservation-form";
import { prisma } from "@/lib/prisma";

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
  try {
    const facilities = await prisma.facility.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, nama: true, lokasi: true },
      orderBy: { nama: "asc" },
    });
    if (facilities.length > 0) return facilities;
  } catch {
    // fallback ke dummy jika DB belum siap / build tanpa DATABASE_URL
  }
  // TODO: data dummy hardcoded sementara — harus diganti ke query Prisma asli (status ACTIVE: id, nama, lokasi) begitu data fasilitas sungguhan tersedia / seed sudah dijalankan
  return [
    { id: 1, nama: "RK-101", lokasi: "Gedung A Lt.1" },
    { id: 3, nama: "Aula Utama", lokasi: "Gedung Serbaguna" },
    { id: 4, nama: "Lab Komputer 1", lokasi: "Gedung B Lt.2" },
    { id: 7, nama: "Lapangan Basket", lokasi: "Area Olahraga" },
  ];
}

export default async function ReservasiBaruPage() {
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
