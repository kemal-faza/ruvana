"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useSyncExternalStore } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"

export function getNextTheme(resolvedTheme: string | undefined): "light" | "dark" {
  return resolvedTheme === "dark" ? "light" : "dark"
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [transitioning, setTransitioning] = useState(false)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "Gunakan tema terang" : "Gunakan tema gelap"

  async function toggleTheme() {
    const nextTheme = getNextTheme(resolvedTheme)

    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(nextTheme)
      return
    }

    setTransitioning(true)
    document.documentElement.classList.add("theme-transition")
    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(nextTheme))
      })
      await transition.finished
    } finally {
      document.documentElement.classList.remove("theme-transition")
      setTransitioning(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={transitioning}
      className="cursor-pointer"
      onClick={toggleTheme}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
