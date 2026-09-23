import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { navigation, shellAccount, shellLogoutDestination } from "@/config/navigation"

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navigation={navigation} account={shellAccount} logoutDestination={shellLogoutDestination}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </AppShell>
  )
}