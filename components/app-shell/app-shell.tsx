import type { LucideIcon } from "lucide-react"

import { AppShellClient } from "@/components/app-shell/app-shell-client"
import type { AppShellProps, SerializableNavigationGroup } from "@/components/app-shell/types"

function serializeNavigation(
  navigation: AppShellProps["navigation"],
): readonly SerializableNavigationGroup[] {
  return navigation.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      icon: (item.icon as LucideIcon).displayName ?? item.icon.name,
    })),
  }))
}

export function AppShell({ navigation, account, children }: AppShellProps) {
  return (
    <AppShellClient
      navigation={serializeNavigation(navigation)}
      account={account}
    >
      {children}
    </AppShellClient>
  )
}
