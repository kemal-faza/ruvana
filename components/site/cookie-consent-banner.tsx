"use client"

import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

const CONSENT_KEY = "ruvana-cookie-consent-v1"

type ConsentChoice = "accepted" | "essential-only"

let localChoice: ConsentChoice | null = null

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener("ruvana-cookie-consent-change", onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener("ruvana-cookie-consent-change", onChange)
  }
}

function hasChoice() {
  try {
    const choice = localStorage.getItem(CONSENT_KEY)
    localChoice = choice === "accepted" || choice === "essential-only" ? choice : null
    return localChoice !== null
  } catch {
    return localChoice !== null
  }
}

export function CookieConsentBanner() {
  const hasStoredChoice = useSyncExternalStore(subscribe, hasChoice, () => false)
  const visible = !hasStoredChoice

  function choose(choice: ConsentChoice) {
    localChoice = choice
    try {
      localStorage.setItem(CONSENT_KEY, choice)
    } catch {
      // Sesi browser tetap bisa menggunakan halaman publik meski penyimpanan dibatasi.
    }
    window.dispatchEvent(new Event("ruvana-cookie-consent-change"))
  }

  if (!visible) return null

  return (
    <section
      aria-label="Persetujuan cookie"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-card border border-border bg-card p-4 shadow-lg sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl space-y-1">
          <h2 className="font-semibold">Pilihan cookie</h2>
          <p className="text-sm text-muted-foreground">
            Ruvana memakai cookie wajib untuk keamanan sesi masuk. Saat ini kami tidak menggunakan cookie analitik atau iklan.
            Pilihan Anda disimpan di perangkat ini.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => choose("essential-only")}>
            Hanya yang wajib
          </Button>
          <Button type="button" onClick={() => choose("accepted")}>
            Setuju
          </Button>
        </div>
      </div>
    </section>
  )
}
