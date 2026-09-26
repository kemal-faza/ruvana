"use client";

import { useState } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
              className="min-h-11 rounded-lg border border-input px-3 hover:bg-muted"
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
              className="min-h-11 rounded-lg border border-input px-3 hover:bg-muted"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="filter-lokasi">Lokasi</FieldLabel>
            <Select name="location" defaultValue={location || null} modal={false}>
              <SelectTrigger id="filter-lokasi" className="min-h-11 w-full">
                <SelectValue placeholder="Semua lokasi" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value={null}>Semua lokasi</SelectItem>
                {selectedLocationUnavailable && (
                  <SelectItem value={location}>Lokasi tidak tersedia: {location}</SelectItem>
                )}
                {locations.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="min-h-11 w-full sm:col-span-2 xl:col-span-1">
            Terapkan filter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
