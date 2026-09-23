import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TIPE_FASILITAS, TIPE_FASILITAS_LABEL } from "@/config/business"
import { cn } from "@/lib/utils"

interface FacilityFilterFormProps {
  value?: {
    search?: string
    type?: string
    location?: string
    minCapacity?: number
  }
}

const controlClass =
  "flex min-h-11 items-center gap-2.5 rounded-control border border-border bg-background px-3 text-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"

export function FacilityFilterForm({ value }: FacilityFilterFormProps) {
  return (
    <form
      method="get"
      action="/fasilitas"
      aria-label="Filter fasilitas"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-subtle sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]"
    >
      <Field>
        <FieldTitle>Kata kunci</FieldTitle>
        <div className={controlClass}>
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Input
            type="search"
            name="search"
            aria-label="Kata kunci"
            placeholder="Nama fasilitas"
            defaultValue={value?.search ?? ""}
            maxLength={200}
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </Field>

      <Field>
        <FieldTitle>Tipe</FieldTitle>
        <select
          name="type"
          aria-label="Tipe"
          defaultValue={value?.type ?? ""}
          className={cn(controlClass, "appearance-none text-sm")}
        >
          <option value="">Semua tipe</option>
          {TIPE_FASILITAS.map((tipe) => (
            <option key={tipe} value={tipe}>
              {TIPE_FASILITAS_LABEL[tipe]}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldTitle>Lokasi</FieldTitle>
        <div className={controlClass}>
          <Input
            type="text"
            name="location"
            aria-label="Lokasi"
            placeholder="Gedung A"
            defaultValue={value?.location ?? ""}
            maxLength={200}
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </Field>

      <Field>
        <FieldTitle>Kapasitas minimum</FieldTitle>
        <div className={controlClass}>
          <Input
            type="number"
            name="minCapacity"
            aria-label="Kapasitas minimum"
            placeholder="30"
            min={1}
            defaultValue={value?.minCapacity ?? ""}
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
      </Field>

      <div className="flex items-end">
        <Button type="submit" className="min-h-11 w-full shrink-0 lg:w-auto">
          Terapkan
        </Button>
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full shrink-0 lg:w-auto"
          nativeButton={false}
          render={<Link href="/fasilitas" />}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}
