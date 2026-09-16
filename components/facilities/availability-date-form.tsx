import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface AvailabilityDateFormProps {
  facilityId: number
  date: string
  today: string
}

export function AvailabilityDateForm({ facilityId, date, today }: AvailabilityDateFormProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field className="w-full max-w-56">
        <FieldLabel htmlFor="availability-date">Tanggal</FieldLabel>
        <Input
          key={date}
          id="availability-date"
          name="date"
          type="date"
          defaultValue={date}
          className="min-h-11"
        />
      </Field>

      <Button type="submit" className="min-h-11">
        Tampilkan
      </Button>

      {date !== today && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          nativeButton={false}
          render={<Link href={`/fasilitas/${facilityId}?date=${today}`} />}
        >
          Hari ini
        </Button>
      )}
    </form>
  )
}
