import type { NavigationGroup } from "@/components/app-shell/types"
import { staffNavigation } from "@/components/staff/navigation"
import { Role } from "@/generated/prisma/enums"

import { adminNavigation } from "@/config/admin-navigation"
import { navigation } from "@/config/navigation"
import type { SessionUser } from "@/lib/auth"

export function navigationForRole(role: SessionUser["role"] | null): readonly NavigationGroup[] {
  if (role === Role.petugas) return staffNavigation
  if (role === Role.admin) return adminNavigation
  return navigation
}
