import { Building2, CalendarDays, ClipboardList, History, LayoutDashboard, Settings } from "lucide-react";

import type { NavigationGroup } from "@/components/app-shell/types";

// Navigasi seksi reservasi (dipakai halaman form + riwayat).
export const reservasiNavigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "ringkasan", label: "Ringkasan", href: "/", icon: LayoutDashboard },
      { key: "reservasi", label: "Reservasi", href: "/reservasi", icon: CalendarDays, exact: true },
      { key: "riwayat", label: "Reservasi Saya", href: "/reservasi/riwayat", icon: History },
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
