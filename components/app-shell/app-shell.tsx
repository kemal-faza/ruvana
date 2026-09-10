"use client"

import { motion, useReducedMotion } from "motion/react"

import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { MobileAppBar } from "@/components/app-shell/mobile-app-bar"
import type { AppShellProps } from "@/components/app-shell/types"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getMotionTransition } from "@/lib/motion"

export function AppShell({ navigation, account, logoutDestination, children }: AppShellProps) {
  const reduceMotion = useReducedMotion()
  const transition = getMotionTransition(reduceMotion)

  return (
    <SidebarProvider>
      <AppSidebar
        navigation={navigation}
        account={account}
        logoutDestination={logoutDestination}
      />
      <SidebarInset>
        <MobileAppBar />
        <motion.div
          data-motion-transform="true"
          initial={{ opacity: 0, y: reduceMotion === true ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="min-w-0 flex-1"
        >
          {children}
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  )
}
