import { ClipboardList, LayoutDashboard } from "lucide-react";

import type { NavigationGroup } from "@/components/app-shell/types";

export const staffNavigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/petugas", icon: LayoutDashboard, exact: true },
      { key: "antrian", label: "Persetujuan reservasi", href: "/petugas/antrian", icon: ClipboardList },
    ],
  },
];

export const staffQueueNavigation: readonly NavigationGroup[] = [
  {
    key: "utama",
    label: "Utama",
    items: [{ key: "antrian", label: "Persetujuan reservasi", href: "/petugas/antrian", icon: ClipboardList }],
  },
];
