import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { navigation, shellAccountFromUser } from "@/config/navigation"
import { getSessionUser } from "@/lib/auth"

export default async function FasilitasLayout({ children }: { children: ReactNode }) {
  const account = shellAccountFromUser(await getSessionUser())

  return (
    <AppShell navigation={navigation} account={account}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </AppShell>
  )
}
