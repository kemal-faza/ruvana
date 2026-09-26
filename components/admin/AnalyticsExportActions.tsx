"use client";

import { Download } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ExportFormat = "csv" | "xlsx" | "pdf";

const EXPORT_FORMATS: readonly ExportFormat[] = ["csv", "xlsx", "pdf"];

function exportUrl(format: ExportFormat, filters: { startDate: string; endDate: string; location: string }): string {
  const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
  if (filters.location) params.set("location", filters.location);
  return `/api/admin/analitik/ekspor/${format}?${params.toString()}`;
}

function responseFilename(response: Response, format: ExportFormat): string {
  const disposition = response.headers.get("content-disposition");
  const match = disposition ? /filename="?([^";]+)"?/iu.exec(disposition) : null;
  return match?.[1] ?? `analitik.${format}`;
}

export default function AnalyticsExportActions({
  filters,
}: {
  filters: { startDate: string; endDate: string; location: string };
}) {
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null);
  const [errorFormat, setErrorFormat] = useState<ExportFormat | null>(null);
  const inFlight = useRef(false);

  async function download(format: ExportFormat) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingFormat(format);
    setErrorFormat(null);

    try {
      const response = await fetch(exportUrl(format, filters), { credentials: "same-origin" });
      if (!response.ok) throw new Error("Respons ekspor tidak berhasil.");

      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = responseFilename(response, format);
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setErrorFormat(format);
    } finally {
      inFlight.current = false;
      setPendingFormat(null);
    }
  }

  return (
    <section
      aria-label="Unduh rekap analitik"
      aria-busy={pendingFormat !== null}
      className="flex w-full flex-col gap-2 sm:w-auto sm:items-end"
    >
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pendingFormat !== null}
            aria-label={`Unduh ${format.toUpperCase()}`}
            onClick={() => void download(format)}
          >
            <Download aria-hidden="true" />
            <span className="sm:hidden">{format.toUpperCase()}</span>
            <span className="hidden sm:inline">
              {pendingFormat === format ? `Menyiapkan ${format.toUpperCase()}…` : `Unduh ${format.toUpperCase()}`}
            </span>
          </Button>
        ))}
      </div>
      {pendingFormat && <p role="status" className="text-sm text-muted-foreground">Menyiapkan berkas {pendingFormat.toUpperCase()}…</p>}
      {errorFormat && (
        <p role="alert" className="text-sm text-destructive">
          Gagal mengunduh berkas {errorFormat.toUpperCase()}. Periksa filter lalu coba lagi.
        </p>
      )}
    </section>
  );
}
