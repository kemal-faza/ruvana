import { AppShellClient } from "@/components/app-shell/app-shell-client"
import { navigationIconName } from "@/components/app-shell/navigation-icons"
import type { AppShellProps, SerializableNavigationGroup } from "@/components/app-shell/types"

function serializeNavigation(
  navigation: AppShellProps["navigation"],
): readonly SerializableNavigationGroup[] {
  return navigation.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      icon: navigationIconName(item.icon),
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
