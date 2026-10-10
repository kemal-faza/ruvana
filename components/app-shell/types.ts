import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export interface NavigationItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
  /**
   * Bila true, item hanya active pada pathname yang sama persis.
   * Dipakai untuk item parent yang anak routenya punya butir menu sendiri
   * (mis. /reservasi vs /reservasi/riwayat) agar tidak double-active.
   */
  exact?: boolean
  /**
   * Awalan pathname tambahan yang ikut menandai item ini aktif, di luar `href`.
   * Dipakai bila satu menu menaungi beberapa rute bersaudara yang tidak berbagi
   * awalan `href` — mis. "Reservasi" (`/reservasi/riwayat`) juga aktif di form
   * `/reservasi`. Cocok bila pathname sama persis atau berupa anak (`prefix/...`).
   */
  activePrefixes?: readonly string[]
}

export interface NavigationGroup {
  key: string
  label: string
  items: readonly NavigationItem[]
}

export interface SerializableNavigationItem extends Omit<NavigationItem, "icon"> {
  icon: string
}

export interface SerializableNavigationGroup extends Omit<NavigationGroup, "items"> {
  items: readonly SerializableNavigationItem[]
}

export interface ShellAccount {
  displayName: string
  roleLabel: string
}

export interface AppShellProps {
  navigation: readonly NavigationGroup[]
  account: ShellAccount | null
  children: ReactNode
}
