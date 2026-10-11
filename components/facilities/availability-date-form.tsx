"use client"

import type { FormEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldTitle } from "@/components/ui/field"

interface AvailabilityDateFormProps {
  facilityId: number
  date: string
  today: string
  basePath?: string
}

// Sama seperti komponen date-fns lain di proyek ini: parse manual di kalender lokal
// (bukan `new Date(iso)`) supaya tidak tergeser sehari oleh offset zona waktu browser.
function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function AvailabilityDateForm({ facilityId, date, today, basePath = "/fasilitas" }: AvailabilityDateFormProps) {
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Navigasi lunak (tanpa muat ulang penuh) agar posisi layar tidak melompat;
    // native GET tetap menjadi fallback tanpa JavaScript.
    e.preventDefault()
    const params = new URLSearchParams()
    for (const [key, value] of new FormData(e.currentTarget).entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <form method="get" onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <FieldTitle>Tanggal</FieldTitle>
        <div className="flex min-h-12 items-center gap-2.5 rounded-control border border-border bg-background px-3.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <DatePicker
            key={date}
            name="date"
            aria-label="Pilih tanggal ketersediaan"
            defaultDate={parseIsoDateLocal(date)}
          />
        </div>
      </div>

      <Button type="submit" className="min-h-12 shrink-0">
        Tampilkan
      </Button>

      {date !== today && (
        <Button
          type="button"
          variant="outline"
          className="min-h-12 shrink-0"
          nativeButton={false}
          render={<Link href={`${basePath}/${facilityId}?date=${today}`} scroll={false} />}
        >
          Hari ini
        </Button>
      )}
    </form>
  )
}
