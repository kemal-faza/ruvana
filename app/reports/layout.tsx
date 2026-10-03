import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { navigationForRole } from "@/config/navigation-for-role"
import { shellAccountFromUser } from "@/config/navigation"
import { getSessionUser } from "@/lib/auth"

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  const account = shellAccountFromUser(user)

  return (
    <AppShell navigation={navigationForRole(user?.role ?? null)} account={account}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </AppShell>
  )
}
