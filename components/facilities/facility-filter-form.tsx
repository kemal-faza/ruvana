"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"

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
// mentah (enum) di trigger, bukan label domain Indonesia. Opsi "Semua tipe"
// bernilai kosong supaya form GET tidak mengirim `type=` berisi nilai yang tidak
// dikenal; server membuang parameter kosong sebelum validasi.
const OPSI_TIPE = [
  { value: "", label: "Semua tipe" },
  ...TIPE_FASILITAS.map((tipe) => ({
    value: tipe,
    label: TIPE_FASILITAS_LABEL[tipe],
  })),
]

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X aria-hidden="true" className="size-4" />
    </button>
  )
}

// Nilai filter berubah lewat navigasi (mis. tautan Reset), bukan remount. Kunci
// ini membuat field di-reset ke nilai baru tanpa menyisakan state lama seperti
// tipe yang sudah terpilih.
function filterKey(value: FacilityFilterFormProps["value"]): string {
  return JSON.stringify(value ?? {})
}

export function FacilityFilterForm(props: FacilityFilterFormProps) {
  return <FacilityFilterFormFields key={filterKey(props.value)} {...props} />
}

function FacilityFilterFormFields({ value, actionPath = "/fasilitas" }: FacilityFilterFormProps) {
  // `alat` menyimpan jumlah unit, bukan kapasitas orang, jadi label kontrol
  // kapasitas menyesuaikan tipe yang sedang dipilih.
  const [search, setSearch] = useState(value?.search ?? "")
  const [tipe, setTipe] = useState(value?.type ?? "")
  const [lokasi, setLokasi] = useState(value?.location ?? "")
  const [minCapacity, setMinCapacity] = useState(
    value?.minCapacity !== undefined ? String(value.minCapacity) : "",
  )
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={200}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
          {search !== "" && <ClearButton label="Hapus kata kunci" onClick={() => setSearch("")} />}
        </div>
      </Field>

      <Field>
        <FieldTitle className="min-h-10">Tipe</FieldTitle>
        <div className={controlClass}>
          <Select
            name="type"
            items={OPSI_TIPE}
            value={tipe}
            modal={false}
            onValueChange={(nilai) => setTipe(nilai ?? "")}
          >
            <SelectTrigger
              aria-label="Tipe"
              className="min-h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
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
          {tipe !== "" && <ClearButton label="Hapus pilihan tipe" onClick={() => setTipe("")} />}
        </div>
      </Field>

      <Field>
        <FieldTitle className="min-h-10">Lokasi</FieldTitle>
        <div className={controlClass}>
          <Input
            type="text"
            name="location"
            aria-label="Lokasi"
            placeholder="Gedung A"
            value={lokasi}
            onChange={(event) => setLokasi(event.target.value)}
            maxLength={200}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
          {lokasi !== "" && <ClearButton label="Hapus lokasi" onClick={() => setLokasi("")} />}
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
            value={minCapacity}
            onChange={(event) => setMinCapacity(event.target.value)}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
          />
          {minCapacity !== "" && (
            <ClearButton
              label="Hapus nilai kapasitas"
              onClick={() => setMinCapacity("")}
            />
          )}
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
