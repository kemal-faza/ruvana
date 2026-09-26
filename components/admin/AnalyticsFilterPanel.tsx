"use client";

import { useState } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
            <span>Tanggal awal</span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="h-11 min-w-0 rounded-lg border border-input bg-transparent px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
              aria-label="Tanggal awal"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
            <span>Tanggal akhir</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="h-11 min-w-0 rounded-lg border border-input bg-transparent px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
              aria-label="Tanggal akhir"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
            <span>Lokasi</span>
            <select
              name="location"
              defaultValue={location}
              aria-label="Lokasi"
              className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            >
              <option value="">Semua lokasi</option>
              {selectedLocationUnavailable && (
                <option value={location}>Lokasi tidak tersedia: {location}</option>
              )}
              {locations.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="min-h-11 w-full sm:col-span-2 xl:col-span-1">
            Terapkan filter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
