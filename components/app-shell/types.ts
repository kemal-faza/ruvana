import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export interface NavigationItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
}

export interface NavigationGroup {
  key: string
  label: string
  items: readonly NavigationItem[]
}

export interface ShellAccount {
  displayName: string
  roleLabel: string
}

export interface AppShellProps {
  navigation: readonly NavigationGroup[]
  account: ShellAccount
  logoutDestination: string
  children: ReactNode
}
