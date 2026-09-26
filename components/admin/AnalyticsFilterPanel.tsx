"use client";

import { useState } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";

const FILTER_FORM_ID = "filter-analitik";

export default function AnalyticsFilterPanel({
  startDate,
  endDate,
  location,
  locations,
  selectedLocationUnavailable,
  periodLabel,
  locationLabel,
  startExpanded,
}: {
  startDate: string;
  endDate: string;
  location: string;
  locations: string[];
  selectedLocationUnavailable: boolean;
  periodLabel: string;
  locationLabel: string;
  startExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(startExpanded);
  const [selectedLocation, setSelectedLocation] = useState(location);
  const locationOptions = selectedLocationUnavailable ? [...locations, location] : locations;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <dl className="min-w-0">
            <dt className="sr-only">Periode aktif</dt>
            <dd className="truncate text-sm font-medium">{periodLabel}</dd>
            <dt className="sr-only">Lokasi aktif</dt>
            <dd className="truncate text-xs text-muted-foreground">{locationLabel}</dd>
          </dl>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0"
            aria-expanded={expanded}
            aria-controls={FILTER_FORM_ID}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Tutup filter" : "Ubah filter"}
          </Button>
        </div>

        <form
          id={FILTER_FORM_ID}
          action="/admin/analitik"
          method="get"
          className={cn(
            "grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end",
            !expanded && "hidden sm:grid",
          )}
        >
          <Field>
            <FieldLabel htmlFor="filter-tanggal-awal">Tanggal awal</FieldLabel>
            <DatePicker
              id="filter-tanggal-awal"
              name="startDate"
              aria-label="Tanggal awal"
              defaultValue={startDate}
              allowPastDates
              className="min-h-11 rounded-lg border border-input px-3 text-sm hover:bg-muted"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-tanggal-akhir">Tanggal akhir</FieldLabel>
            <DatePicker
              id="filter-tanggal-akhir"
              name="endDate"
              aria-label="Tanggal akhir"
              defaultValue={endDate}
              allowPastDates
              className="min-h-11 rounded-lg border border-input px-3 text-sm hover:bg-muted"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-lokasi">Lokasi</FieldLabel>
            <Combobox
              name="location"
              items={locationOptions}
              value={selectedLocation || null}
              modal={false}
              onValueChange={(value) => setSelectedLocation(value ?? "")}
            >
              <ComboboxInput
                id="filter-lokasi"
                placeholder="Semua lokasi"
                triggerLabel="Buka daftar lokasi"
              >
                {selectedLocation !== "" && <ComboboxClear aria-label="Hapus pilihan lokasi" />}
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
          <Button type="submit" className="min-h-11 w-full sm:col-span-2 xl:col-span-1">
            Terapkan filter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
