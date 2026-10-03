import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { navigationForRole } from "@/config/navigation-for-role"
import { shellAccountFromUser } from "@/config/navigation"
import { Role } from "@/generated/prisma/enums"
import { getSessionUser } from "@/lib/auth"

export default async function FasilitasLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()

  if (!user || user.role !== Role.pengguna) {
    return (
      <>
        <SiteHeader current="fasilitas" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <SiteFooter />
      </>
    )
  }

  const account = shellAccountFromUser(user)

  return (
    <AppShell navigation={navigationForRole(user.role)} account={account}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </AppShell>
  )
}
