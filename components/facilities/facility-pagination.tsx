import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface FacilityPaginationProps {
  page: number
  totalPages: number
  /** Filter aktif yang harus dipertahankan saat berpindah halaman. */
  query: Record<string, string | number | undefined>
}

function buildHref(page: number, query: FacilityPaginationProps["query"]): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value))
    }
  }
  params.set("page", String(page))
  return `/fasilitas?${params.toString()}`
}

export function FacilityPagination({ page, totalPages, query }: FacilityPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const isFirst = page <= 1
  const isLast = page >= totalPages

  return (
    <nav
      aria-label="Navigasi halaman fasilitas"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        className="min-h-11"
        nativeButton={false}
        disabled={isFirst}
        aria-disabled={isFirst}
        render={isFirst ? undefined : <Link href={buildHref(page - 1, query)} />}
      >
        <ChevronLeft aria-hidden="true" />
        Sebelumnya
      </Button>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        Halaman {page} dari {totalPages}
      </p>

      <Button
        variant="outline"
        className="min-h-11"
        nativeButton={false}
        disabled={isLast}
        aria-disabled={isLast}
        render={isLast ? undefined : <Link href={buildHref(page + 1, query)} />}
      >
        Berikutnya
        <ChevronRight aria-hidden="true" data-motion-icon="inline-end" />
      </Button>
    </nav>
  )
}
