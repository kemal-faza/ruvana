import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell/app-shell"
import { staffNavigation, staffQueueNavigation } from "@/components/staff/navigation"
import { Role } from "@/generated/prisma/enums"
import { requirePetugasAtauAdmin } from "@/lib/auth"

export default async function PetugasLayout({ children }: { children: ReactNode }) {
  const user = await requirePetugasAtauAdmin()
  const navigation = user.role === Role.petugas ? staffNavigation : staffQueueNavigation
  const account = {
    displayName: user.nama,
    roleLabel: user.role === Role.admin ? "Admin" : "Petugas",
  }

  return (
    <AppShell navigation={navigation} account={account}>
      {children}
    </AppShell>
  )
}
