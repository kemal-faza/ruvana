"use client"

import * as React from "react"
import { cn } from "cn"
import { format, startOfToday } from "date-fns"
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
  "aria-label": string
  placeholder?: string
  className?: string
}

export function DatePicker({
  name,
  "aria-label": ariaLabel,
  placeholder = "Pilih tanggal",
  className,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date>()
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <input type="hidden" name={name} value={date ? format(date, ISO_FORMAT) : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
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
            disabled={{ before: startOfToday() }}
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
