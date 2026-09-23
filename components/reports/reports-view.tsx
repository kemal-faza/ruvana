"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Plus, Search, SearchX } from "lucide-react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FilterTabs, type ReportFilter } from "@/components/reports/filter-tabs"
import { ReportCard } from "@/components/reports/report-card"
import { ReportDetailSheet } from "@/components/reports/report-detail-sheet"
import { ReportFormDialog } from "@/components/reports/report-form-dialog"
import { ReportsPagination } from "@/components/reports/reports-pagination"
import type { FacilityReportOption, ReportItem, ReportListView } from "@/lib/services/report-service"

const PAGE_SIZE = 6

interface ReportsViewProps {
  view: ReportListView
  facilityOptions: FacilityReportOption[]
}

export function ReportsView({ view, facilityOptions }: ReportsViewProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<ReportFilter>("ALL")
  const [sort, setSort] = useState<"desc" | "asc">("desc")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ReportItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    let items = view.items
    if (filter !== "ALL") {
      items = items.filter((report) => report.status === filter)
    }
    const normalized = query.trim().toLowerCase()
    if (normalized) {
      items = items.filter((report) =>
        [report.facilityNama, report.kategori, report.deskripsi, report.facilityLokasi].some((value) =>
          value.toLowerCase().includes(normalized)
        )
      )
    }
    return [...items].sort((a, b) =>
      sort === "asc" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)
    )
  }, [view.items, filter, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)

  const openDetail = (id: number) => {
    const item = view.items.find((report) => report.id === id)
    if (item) {
      setSelected(item)
      setDetailOpen(true)
    }
  }

  const handleCreated = (item: ReportItem) => {
    setFormOpen(false)
    setSelected(item)
    setDetailOpen(true)
    router.refresh()
  }

  const resetFilters = () => {
    setQuery("")
    setFilter("ALL")
    setSort("desc")
    setPage(1)
  }

  const canCreate = facilityOptions.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Laporan</h1>
          <p className="max-w-2xl text-muted-foreground">
            Pantau laporan kerusakan fasilitas kampus yang telah Anda ajukan beserta progres penanganannya.
          </p>
        </header>
        <Button
          className="shrink-0"
          onClick={() => setFormOpen(true)}
          disabled={!canCreate}
          title={canCreate ? undefined : "Belum ada fasilitas yang tersedia untuk dilaporkan"}
        >
          <Plus aria-hidden="true" />
          Ajukan Laporan
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-8"
              placeholder="Cari laporan..."
              aria-label="Cari laporan"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-laporan" className="sr-only">
              Urutkan laporan
            </label>
            <select
              id="sort-laporan"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as "desc" | "asc")
                setPage(1)
              }}
              className="h-8 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
        </div>

        <FilterTabs
          active={filter}
          total={view.total}
          totalByStatus={view.totalByStatus}
          onChange={(next) => {
            setFilter(next)
            setPage(1)
          }}
        />
      </div>

      <section aria-label="Daftar laporan" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 1 ? "1 laporan" : `${filtered.length} laporan`} ditemukan
        </p>

        {pageItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pageItems.map((report) => (
              <ReportCard key={report.id} report={report} onSelect={openDetail} />
            ))}
          </div>
        ) : view.total === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList aria-hidden="true" />
              </EmptyMedia>
              <EmptyContent>
                <EmptyTitle>Belum ada laporan</EmptyTitle>
                <EmptyDescription>
                  Ajukan laporan kerusakan fasilitas pertama Anda dan pantau progresnya di halaman ini.
                </EmptyDescription>
              </EmptyContent>
            </EmptyHeader>
            <Button className="min-h-11" onClick={() => setFormOpen(true)} disabled={!canCreate}>
              <Plus aria-hidden="true" />
              Ajukan Laporan
            </Button>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX aria-hidden="true" />
              </EmptyMedia>
              <EmptyContent>
                <EmptyTitle>Tidak ada laporan yang cocok</EmptyTitle>
                <EmptyDescription>Coba ubah kata kunci pencarian atau pilih filter status lain.</EmptyDescription>
              </EmptyContent>
            </EmptyHeader>
            <Button variant="outline" className="min-h-11" onClick={resetFilters}>
              Reset filter
            </Button>
          </Empty>
        )}

        <ReportsPagination page={activePage} totalPages={totalPages} onChange={setPage} />
      </section>

      <ReportDetailSheet report={selected} open={detailOpen} onOpenChange={setDetailOpen} />

      <ReportFormDialog
        key={formOpen ? "laporan-form-terbuka" : "laporan-form-tertutup"}
        open={formOpen}
        onOpenChange={setFormOpen}
        facilityOptions={facilityOptions}
        onCreated={handleCreated}
      />
    </div>
  )
}