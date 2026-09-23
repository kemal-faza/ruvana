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
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </Button>
      <p className="text-sm text-muted-foreground">
        Halaman {page} dari {totalPages}
      </p>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  )
}