import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SiteSection = "beranda" | "fasilitas"

const navItems = [
  { label: "Beranda", href: "/", section: "beranda" },
  { label: "Fasilitas", href: "/fasilitas", section: "fasilitas" },
  { label: "Jadwal", href: "#jadwal", section: "jadwal" },
] as const

interface SiteHeaderProps {
  current?: SiteSection
}

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-[72px] w-full max-w-[1256px] items-center justify-between gap-3 px-4 sm:h-[84px] sm:gap-7 sm:px-7">
        <Link
          href="/"
          aria-label="Ruvana — beranda"
          className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight sm:text-xl"
        >
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-[9px] bg-brand-olive text-xs text-card"
          >
            R
          </span>
          RUVANA
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-4 text-[13px] text-muted-foreground min-[701px]:flex min-[901px]:gap-7"
        >
          {navItems.map(({ label, href, section }) => (
            <Link
              key={href}
              href={href}
              aria-current={current === section ? "page" : undefined}
              className="py-2 transition-colors hover:text-foreground focus-visible:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/masuk"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "hidden min-h-11 px-4 text-muted-foreground min-[701px]:inline-flex",
            )}
          >
            Masuk
          </Link>
          <Link href="/daftar" className={cn(buttonVariants(), "min-h-11 gap-2 px-3 sm:px-4")}>
            Daftar
            <ArrowRight aria-hidden="true" data-motion-icon="inline-end" className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
