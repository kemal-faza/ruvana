"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import {
  Building2,
  CalendarDays,
  Circle,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getMotionTransition } from "@/lib/motion"
import type {
  NavigationGroup,
  NavigationItem,
  SerializableNavigationGroup,
  SerializableNavigationItem,
  ShellAccount,
} from "@/components/app-shell/types"

interface AppSidebarProps {
  navigation: readonly (NavigationGroup | SerializableNavigationGroup)[]
  account: ShellAccount
  logoutDestination: string
}

interface NavigationListProps {
  navigation: readonly (NavigationGroup | SerializableNavigationGroup)[]
  onNavigate?: () => void
}

function isNavigationItemActive(pathname: string, item: NavigationItem | SerializableNavigationItem) {
  return pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
}

const iconRegistry = {
  Building2,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings,
} as const

function resolveIcon(icon: NavigationItem["icon"] | string) {
  return typeof icon === "string" ? iconRegistry[icon as keyof typeof iconRegistry] ?? Circle : icon
}

function NavigationList({ navigation, onNavigate }: NavigationListProps) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const transition = getMotionTransition(reduceMotion)

  const navigationMarkup = (
    <nav aria-label="Navigasi utama">
      {navigation.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isNavigationItemActive(pathname, item)
                const Icon = resolveIcon(item.icon)

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active}
                      className="relative min-h-11 px-3 py-2"
                      render={
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => onNavigate?.()}
                        />
                      }
                    >
                      {active && (
                        <motion.span
                          aria-hidden="true"
                          data-motion-transform="true"
                          layoutId={reduceMotion === true ? undefined : isMobile ? "active-navigation-drawer" : "active-navigation-desktop"}
                          transition={transition}
                          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary motion-reduce:!transform-none"
                        />
                      )}
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )

  if (!isMobile) return navigationMarkup

  return (
    <motion.div
      data-motion-transform="true"
      initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0, x: -8 }}
      animate={reduceMotion === true ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={transition}
      className="min-w-0 motion-reduce:!transform-none"
    >
      {navigationMarkup}
    </motion.div>
  )
}

export function AppSidebar({ navigation, account, logoutDestination }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/"
          onClick={() => setOpenMobile(false)}
          className="flex min-h-11 items-center gap-2 rounded-md px-2 text-lg font-semibold"
        >
          <span>Ruvana</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
            <NavigationList navigation={navigation} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{account.displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{account.roleLabel}</p>
          </div>
          <ThemeToggle />
        </div>
        <Link
          href={logoutDestination}
          onClick={() => setOpenMobile(false)}
          className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none"
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          <span>Keluar</span>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}

export { NavigationList }
