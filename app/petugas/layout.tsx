import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { staffNavigation, staffQueueNavigation } from "@/components/staff/navigation"
import { Role } from "@/generated/prisma/enums"
import { getSessionUser } from "@/lib/auth"

export default async function PetugasLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  const navigation = user?.role === Role.petugas
    ? staffNavigation
    : user?.role === Role.admin
      ? staffQueueNavigation
      : []
  const account = user
    ? {
        displayName: user.nama,
        roleLabel: user.role === Role.admin ? "Admin" : user.role === Role.petugas ? "Petugas" : "Pengguna",
      }
    : null

  return (
    <AppShell navigation={navigation} account={account}>
      {children}
    </AppShell>
  )
}
