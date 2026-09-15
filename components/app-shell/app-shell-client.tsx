"use client"

import { motion, useReducedMotion } from "motion/react"

import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { MobileAppBar } from "@/components/app-shell/mobile-app-bar"
import type { SerializableNavigationGroup, ShellAccount } from "@/components/app-shell/types"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getMotionTransition } from "@/lib/motion"

interface AppShellClientProps {
  navigation: readonly SerializableNavigationGroup[]
  account: ShellAccount
  logoutDestination: string
  children: React.ReactNode
}

export function AppShellClient({ navigation, account, logoutDestination, children }: AppShellClientProps) {
  const reduceMotion = useReducedMotion()
  const transition = getMotionTransition(reduceMotion)

  return (
    <SidebarProvider>
      <AppSidebar navigation={navigation} account={account} logoutDestination={logoutDestination} />
      <SidebarInset>
        <MobileAppBar />
        <motion.div
          data-motion-reveal="true"
          initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion === true ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={transition}
          className="min-w-0 flex-1 motion-reduce:!transform-none"
        >
          {children}
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  )
}
