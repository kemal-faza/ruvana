import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { shellAccountFromUser } from "@/config/navigation"
import { requirePengguna } from "@/lib/auth"
import { reservasiNavigation } from "./navigation"

export default async function ReservasiLayout({ children }: { children: ReactNode }) {
  const pengguna = await requirePengguna()
  const account = shellAccountFromUser(pengguna)

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </AppShell>
  )
}
