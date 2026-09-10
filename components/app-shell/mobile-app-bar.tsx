"use client"

import { Menu } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function MobileAppBar() {
  const { isMobile, setOpenMobile } = useSidebar()

  if (!isMobile) return null

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Buka navigasi"
        onClick={() => setOpenMobile(true)}
      >
        <Menu aria-hidden="true" />
      </Button>
      <span className="text-base font-semibold">Ruvana</span>
      <ThemeToggle />
    </header>
  )
}
