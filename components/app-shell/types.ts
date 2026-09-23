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
