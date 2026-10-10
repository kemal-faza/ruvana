import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { shellAccountFromUser } from "@/config/navigation";
import { requirePengguna } from "@/lib/auth";
import { reservasiNavigation } from "./navigation";

// Shell dan guard dipasang sekali untuk seluruh segmen /reservasi agar
// navigasi antar halaman tidak me-remount sidebar dan animasi masuknya.
export default async function ReservasiLayout({ children }: { children: ReactNode }) {
  const pengguna = await requirePengguna();
  const account = shellAccountFromUser(pengguna);

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      {children}
    </AppShell>
  );
}
