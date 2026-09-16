"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
  Building2,
  CalendarDays,
  Circle,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  SwatchBook,
  Users,
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
import { useMotionPreference } from "@/components/motion/use-motion-preference"
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
  SwatchBook,
  Users,
} as const

function resolveIcon(icon: NavigationItem["icon"] | string) {
  return typeof icon === "string" ? iconRegistry[icon as keyof typeof iconRegistry] ?? Circle : icon
}

function NavigationList({ navigation, onNavigate }: NavigationListProps) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const motionPreference = useMotionPreference()

  const navigationMarkup = (
    <nav aria-label="Navigasi utama">
      {navigation.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item, index) => {
                const active = isNavigationItemActive(pathname, item)
                const Icon = resolveIcon(item.icon)

                return (
                  <SidebarMenuItem
                    key={item.key}
                    className="motion-rise motion-rise-stagger motion-rise-stagger-functional"
                    style={{ "--stagger-index": index } as CSSProperties}
                  >
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
                          data-motion-reveal="true"
                          layoutId={motionPreference.reduceMotion ? undefined : isMobile ? "active-navigation-drawer" : "active-navigation-desktop"}
                          transition={motionPreference.spring("gentle")}
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
      data-motion-reveal="true"
      initial={
        motionPreference.reduceMotion
          ? { opacity: 1 }
          : { opacity: 0, x: -motionPreference.distance("sm") }
      }
      animate={{ opacity: 1, x: 0 }}
      transition={motionPreference.spring("gentle")}
      className="min-w-0 motion-reduce:!transform-none"
    >
      {navigationMarkup}
    </motion.div>
  )
}

export function AppSidebar({ navigation, account, logoutDestination }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas">
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
          className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut aria-hidden="true" className="size-4 shrink-0" />
          <span>Keluar</span>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}

export { NavigationList }
