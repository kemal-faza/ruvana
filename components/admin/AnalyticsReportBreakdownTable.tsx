"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const ROWS_PER_PAGE = 10;
const numberFormatter = new Intl.NumberFormat("id-ID");

export default function AnalyticsReportBreakdownTable({
  title,
  ariaLabel,
  rows,
}: {
  title: string;
  ariaLabel: string;
  rows: readonly { label: string; count: number }[];
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/70">
      <h3 className="px-4 py-3 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table aria-label={ariaLabel} className="w-full text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Kelompok</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              visibleRows.map(({ label, count }) => (
                <tr key={label} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {numberFormatter.format(count)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada laporan pada periode dan lokasi ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > ROWS_PER_PAGE && (
        <nav
          aria-label={`Navigasi halaman ${ariaLabel.toLowerCase()}`}
          className="grid grid-cols-2 items-center gap-2 border-t border-border/70 p-3 sm:flex sm:justify-between"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
          >
            Sebelumnya
          </Button>
          <p aria-live="polite" className="order-first col-span-2 text-center text-xs text-muted-foreground sm:order-0">
            Halaman {currentPage} dari {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          >
            Berikutnya
          </Button>
        </nav>
      )}
    </div>
  );
}
