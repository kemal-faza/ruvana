"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SELECT_TRIGGER_ACTION_CLASS } from "@/components/ui/select-classes"
import { TIPE_FASILITAS, TIPE_FASILITAS_LABEL } from "@/config/business"
import { LABEL_FILTER_JUMLAH_ALAT, LABEL_FILTER_KAPASITAS_RUANG } from "@/config/labels"

interface FacilityFilterFormProps {
  actionPath?: string
  value?: {
    search?: string
    type?: string
    location?: string
    minCapacity?: number
  }
}

const controlClass =
  "flex min-h-11 items-center gap-2.5 rounded-control border border-border bg-background px-3 text-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"

// Label opsi untuk Select Ruvana: tanpa `items`, <SelectValue /> merender value
// mentah (enum) di trigger, bukan label domain Indonesia.
const OPSI_TIPE = TIPE_FASILITAS.map((tipe) => ({
  value: tipe,
  label: TIPE_FASILITAS_LABEL[tipe],
}))

export function FacilityFilterForm({ value, actionPath = "/fasilitas" }: FacilityFilterFormProps) {
  // `alat` menyimpan jumlah unit, bukan kapasitas orang, jadi label kontrol
  // kapasitas menyesuaikan tipe yang sedang dipilih.
  const [tipe, setTipe] = useState(value?.type ?? "")
  const isAlat = tipe === "alat"
  const kapasitasLabel = isAlat ? LABEL_FILTER_JUMLAH_ALAT : LABEL_FILTER_KAPASITAS_RUANG

  return (
    <form
      method="get"
      action={actionPath}
      aria-label="Filter fasilitas"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-subtle sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]"
    >
      <Field>
        <FieldTitle className="min-h-10">Kata kunci</FieldTitle>
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
        <FieldTitle className="min-h-10">Tipe</FieldTitle>
        <Select
          name="type"
          items={OPSI_TIPE}
          value={tipe || null}
          modal={false}
          onValueChange={(nilai) => setTipe(nilai ?? "")}
        >
          <SelectTrigger
            aria-label="Tipe"
            className={`${SELECT_TRIGGER_ACTION_CLASS} w-full`}
          >
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {OPSI_TIPE.map((opsi) => (
              <SelectItem key={opsi.value} value={opsi.value}>
                {opsi.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldTitle className="min-h-10">Lokasi</FieldTitle>
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
        <FieldTitle className="min-h-10">{kapasitasLabel}</FieldTitle>
        <div className={controlClass}>
          <Input
            type="number"
            name="minCapacity"
            aria-label={kapasitasLabel}
            placeholder={isAlat ? "2" : "30"}
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
          render={<Link href={actionPath} />}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}
