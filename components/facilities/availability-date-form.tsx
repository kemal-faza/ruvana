import Link from "next/link"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldTitle } from "@/components/ui/field"

interface AvailabilityDateFormProps {
  facilityId: number
  date: string
  today: string
}

// Sama seperti komponen date-fns lain di proyek ini: parse manual di kalender lokal
// (bukan `new Date(iso)`) supaya tidak tergeser sehari oleh offset zona waktu browser.
function parseIsoDateLocal(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function AvailabilityDateForm({ facilityId, date, today }: AvailabilityDateFormProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="flex w-full max-w-56 flex-col gap-1.5">
        <FieldTitle>Tanggal</FieldTitle>
        <div className="flex min-h-12 items-center gap-2.5 rounded-control border border-border bg-background px-3.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <DatePicker
            key={date}
            name="date"
            aria-label="Pilih tanggal ketersediaan"
            defaultDate={parseIsoDateLocal(date)}
            disabled={false}
          />
        </div>
      </div>

      <Button type="submit" className="min-h-12">
        Tampilkan
      </Button>

      {date !== today && (
        <Button
          type="button"
          variant="outline"
          className="min-h-12"
          nativeButton={false}
          render={<Link href={`/fasilitas/${facilityId}?date=${today}`} />}
        >
          Hari ini
        </Button>
      )}
    </form>
  )
}
