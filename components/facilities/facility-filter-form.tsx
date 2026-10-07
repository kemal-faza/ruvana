"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TIPE_FASILITAS } from "@/config/business"
import {
  LABEL_FILTER_JUMLAH_ALAT,
  LABEL_FILTER_KAPASITAS_RUANG,
  LABEL_TIPE_FASILITAS,
} from "@/config/labels"
import type { TipeFasilitas } from "@/generated/prisma/enums"

interface FacilityFilterFormProps {
  actionPath?: string
  locations: string[]
  value?: {
    search?: string
    type?: string
    location?: string
    minCapacity?: number
  }
}

const controlClass =
  "flex min-h-11 items-center gap-2.5 rounded-control border border-border bg-background px-3 text-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"

export function FacilityFilterForm({ value, locations, actionPath = "/fasilitas" }: FacilityFilterFormProps) {
  // `alat` menyimpan jumlah unit, bukan kapasitas orang, jadi label kontrol
  // kapasitas menyesuaikan tipe yang sedang dipilih.
  const [tipe, setTipe] = useState(value?.type ?? "")
  const [lokasi, setLokasi] = useState(value?.location ?? "")
  const isAlat = tipe === "alat"
  const kapasitasLabel = isAlat ? LABEL_FILTER_JUMLAH_ALAT : LABEL_FILTER_KAPASITAS_RUANG

  return (
    <form method="get" action={actionPath} aria-label="Filter fasilitas">
      <Card size="sm">
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <Field>
            <FieldLabel htmlFor="search">Kata kunci</FieldLabel>
            <div className={controlClass}>
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <Input
                id="search"
                type="search"
                name="search"
                placeholder="Nama fasilitas"
                defaultValue={value?.search ?? ""}
                maxLength={200}
                className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="type">Tipe</FieldLabel>
            <Combobox
              name="type"
              items={TIPE_FASILITAS}
              value={tipe || null}
              modal={false}
              itemToStringLabel={(option) => LABEL_TIPE_FASILITAS[option as TipeFasilitas]}
              onValueChange={(option) => setTipe(option ?? "")}
            >
              <ComboboxInput id="type" placeholder="Semua tipe" triggerLabel="Buka daftar tipe">
                {tipe !== "" && <ComboboxClear aria-label="Hapus pilihan tipe" />}
              </ComboboxInput>
              <ComboboxContent>
                <ComboboxList>
                  {(option: string) => (
                    <ComboboxItem key={option} value={option}>
                      {LABEL_TIPE_FASILITAS[option as TipeFasilitas]}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>Tipe tidak ditemukan.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>

          <Field>
            <FieldLabel htmlFor="location">Lokasi</FieldLabel>
            <Combobox
              name="location"
              items={locations}
              value={lokasi || null}
              modal={false}
              onValueChange={(option) => setLokasi(option ?? "")}
            >
              <ComboboxInput id="location" placeholder="Semua lokasi" triggerLabel="Buka daftar lokasi">
                {lokasi !== "" && <ComboboxClear aria-label="Hapus pilihan lokasi" />}
              </ComboboxInput>
              <ComboboxContent>
                <ComboboxList>
                  {(option: string) => (
                    <ComboboxItem key={option} value={option}>
                      {option}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>Lokasi tidak ditemukan.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>

          <Field>
            <FieldLabel htmlFor="minCapacity">{kapasitasLabel}</FieldLabel>
            <div className={controlClass}>
              <Input
                id="minCapacity"
                type="number"
                name="minCapacity"
                placeholder={isAlat ? "2" : "30"}
                min={1}
                defaultValue={value?.minCapacity ?? ""}
                className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </Field>

          <div className="flex items-end gap-2">
            <Button type="submit" className="min-h-11">
              Terapkan
            </Button>
            <Button variant="ghost" className="min-h-11" nativeButton={false} render={<Link href={actionPath} />}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
