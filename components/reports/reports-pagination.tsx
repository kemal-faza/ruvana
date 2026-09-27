import { Button } from "@/components/ui/button"

interface ReportsPaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function ReportsPagination({ page, totalPages, onChange }: ReportsPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Navigasi halaman laporan" className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </Button>
      <p className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
        {page} / {totalPages}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  )
}
