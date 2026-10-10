"use client"

import { Menu } from "lucide-react"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function MobileAppBar() {
  const { isMobile, setOpenMobile } = useSidebar()

  if (!isMobile) return null

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Buka navigasi"
        onClick={() => setOpenMobile(true)}
      >
        <Menu aria-hidden="true" />
      </Button>
      <Link href="/" aria-label="Ruvana — beranda" className="inline-flex min-h-11 items-center text-base font-semibold">
        Ruvana
      </Link>
      <ThemeToggle />
    </header>
  )
}
