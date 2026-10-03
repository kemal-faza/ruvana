import { Role } from "@/generated/prisma/enums"
import type { SessionUser } from "@/lib/auth"

export function canShowFacilitySearch(role: SessionUser["role"] | null): boolean {
  return role === null || role === Role.pengguna
}
