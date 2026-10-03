"use client"

import * as React from "react"
import { cn } from "cn"
import { format, parseISO, startOfToday } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarDays } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Nilai disimpan sebagai `yyyy-MM-dd` di input tersembunyi supaya form GET tetap
// mengirim `?tanggal=…` seperti input date native yang digantikan.
const ISO_FORMAT = "yyyy-MM-dd"
const DISPLAY_FORMAT = "d MMM yyyy"

interface DatePickerProps {
  name: string
  id?: string
  "aria-label": string
  placeholder?: string
  /** Nilai awal sebagai string `yyyy-MM-dd` (mis. dari query param). */
  defaultValue?: string
  /** Nilai awal sebagai `Date` (mis. hasil parse manual di zona waktu lokal). */
  defaultDate?: Date
  allowPastDates?: boolean
  className?: string
  disabled?: React.ComponentProps<typeof Calendar>["disabled"]
}

function initialDate(value?: string): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function DatePicker({
  name,
  id,
  "aria-label": ariaLabel,
  placeholder = "Pilih tanggal",
  defaultValue,
  defaultDate,
  allowPastDates = false,
  className,
  disabled,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => defaultDate ?? initialDate(defaultValue))
  const [open, setOpen] = React.useState(false)

  // `disabled` eksplisit menang; kalau tidak diberikan, tanggal lampau hanya
  // diblokir saat `allowPastDates` tidak diaktifkan.
  const disabledDays = disabled ?? (allowPastDates ? undefined : { before: startOfToday() })

  return (
    <>
      <input type="hidden" name={name} value={date ? format(date, ISO_FORMAT) : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          aria-label={ariaLabel}
          data-empty={date ? undefined : "true"}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            // Trigger menumpang pembungkus field, jadi indikator fokus dan latar
            // hover/expanded milik varian ghost dinetralkan — sama seperti Select.
            "h-auto min-h-12 w-full cursor-pointer justify-start gap-2 px-0 text-xs font-normal text-foreground",
            "hover:bg-transparent dark:hover:bg-transparent aria-expanded:bg-transparent",
            "focus-visible:border-0 focus-visible:ring-0",
            "data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          <span className="truncate">
            {date ? format(date, DISPLAY_FORMAT, { locale: localeId }) : placeholder}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            disabled={disabledDays}
            locale={localeId}
            autoFocus
            className="[--cell-size:--spacing(9)]"
            onSelect={(selected) => {
              setDate(selected)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
