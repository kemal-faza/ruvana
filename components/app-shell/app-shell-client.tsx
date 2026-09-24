"use client"

import { motion } from "motion/react"

import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { MobileAppBar } from "@/components/app-shell/mobile-app-bar"
import type { SerializableNavigationGroup, ShellAccount } from "@/components/app-shell/types"
import { useMotionPreference } from "@/components/motion/use-motion-preference"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface AppShellClientProps {
  navigation: readonly SerializableNavigationGroup[]
  account: ShellAccount | null
  children: React.ReactNode
}

export function AppShellClient({ navigation, account, children }: AppShellClientProps) {
  const motionPreference = useMotionPreference()

  return (
    <SidebarProvider>
      <AppSidebar navigation={navigation} account={account} />
      <SidebarInset>
        <MobileAppBar />
        <motion.div
          data-motion-reveal="true"
          initial={
            motionPreference.reduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: motionPreference.distance("sm") }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={motionPreference.spring("gentle")}
          className="min-w-0 flex-1 motion-reduce:transform-none!"
        >
          {children}
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  )
}
