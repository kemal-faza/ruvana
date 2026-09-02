"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Report, ReportFormData, StatusFasilitas, StatusLaporan } from "@/components/reports/types";
import { INITIAL_REPORTS, MOCK_FACILITIES } from "@/components/reports/data";
import FilterTabs from "@/components/reports/FilterTabs";
import SummaryStrip from "@/components/reports/SummaryStrip";
import ReportCard, { EmptyState } from "@/components/reports/ReportCard";
import DetailDrawer from "@/components/reports/DetailDrawer";
import ReportFormModal from "@/components/reports/ReportFormModal";
import MaintenancePanel from "@/components/reports/MaintenancePanel";
import RecentActivity from "@/components/reports/RecentActivity";
import Pagination from "@/components/reports/Pagination";
import "@/components/reports/reports.css";

type FilterKey = "semua" | StatusLaporan;
type SortKey = "terbaru" | "terlama";

const PAGE_SIZE = 5;

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [facilities, setFacilities] = useState(MOCK_FACILITIES);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("semua");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef<number>(page);

  useEffect(() => {
    if (prevPageRef.current === page) return;
    prevPageRef.current = page;
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { semua: reports.length, baru: 0, diproses: 0, selesai: 0, ditolak: 0 };
    for (const r of reports) c[r.status] += 1;
    return c;
  }, [reports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => (activeFilter === "semua" ? true : r.status === activeFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.facilityName.toLowerCase().includes(q) ||
          r.deskripsi.toLowerCase().includes(q) ||
          r.kategori.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sort === "terlama"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [reports, activeFilter, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const handleFilterChange = (key: FilterKey) => {
    setActiveFilter(key);
    setPage(1);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: SortKey) => {
    setSort(value);
    setPage(1);
  };

  const selectedReportFacility = selectedReport
    ? facilities.find((f) => f.id === selectedReport.facilityId)
    : undefined;

  const handleOpenDetail = (report: Report) => setSelectedReport(report);

  const handleSubmitReport = (data: ReportFormData) => {
    const facility = facilities.find((f) => f.id === data.facilityId);
    const now = new Date().toISOString();
    const newReport: Report = {
      id: Math.max(0, ...reports.map((r) => r.id)) + 1,
      userId: 1,
      userName: "Andi Pratama",
      facilityId: data.facilityId!,
      facilityName: facility?.nama ?? "Fasilitas",
      kategori: data.kategori,
      deskripsi: data.deskripsi,
      foto: null,
      status: "baru",
      catatanResolusi: null,
      ditanganiOleh: null,
      createdAt: now,
      updatedAt: now,
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const handleFacilityStatusChange = (facilityId: number, newStatus: StatusFasilitas) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === facilityId ? { ...f, status: newStatus } : f))
    );
  };

  return (
    <main className="min-h-screen rv-page-bg pb-16">
      <div className="rv-hero-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F8987]">
                Reporting &amp; Maintenance
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#263B3A]">
                Laporan &amp; Maintenance
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[#6D8080]">
                Laporkan kerusakan fasilitas dan pantau penanganan serta kondisi fasilitas kampus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D1A438] px-4 py-2.5 text-sm font-semibold text-[#263B3A] shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] focus-visible:ring-offset-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
              </svg>
              Ajukan Laporan
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div ref={summaryRef} className="scroll-mt-4">
          <SummaryStrip
            total={reports.length}
            counts={counts}
            active={activeFilter}
            onSelect={handleFilterChange}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#405E5C]/20 bg-[#FAFCFB] px-3 shadow-sm transition-colors focus-within:border-[#405E5C]/50 focus-within:ring-2 focus-within:ring-[#405E5C]/10">
                <svg className="h-4 w-4 shrink-0 text-[#6F8987]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z" clipRule="evenodd" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Cari fasilitas, kategori, atau pelapor..."
                  className="w-full bg-transparent py-2.5 text-sm text-[#263B3A] placeholder:text-[#9AAEAD] focus:outline-none"
                  aria-label="Cari laporan"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5EFF0] text-[#6D8080] transition-colors hover:bg-[#6F8987]/20"
                    aria-label="Hapus pencarian"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>

              <label className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#405E5C]/20 bg-[#FAFCFB] px-3 py-1.5 shadow-sm">
                <span className="text-xs font-medium text-[#6D8080]">Urutkan</span>
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as SortKey)}
                  className="cursor-pointer bg-transparent text-sm font-medium text-[#405E5C] focus:outline-none"
                  aria-label="Urutkan laporan"
                >
                  <option value="terbaru">Terbaru</option>
                  <option value="terlama">Terlama</option>
                </select>
                <svg className="h-4 w-4 text-[#6F8987]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                </svg>
              </label>
            </div>

            <div className="mt-3">
              <FilterTabs active={activeFilter} onChange={handleFilterChange} counts={counts} />
            </div>

            <section className="mt-4" aria-label="Daftar laporan">
              {pageItems.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {pageItems.map((report) => (
                      <li key={report.id}>
                        <ReportCard
                          report={report}
                          facilityTipe={
                            facilities.find((f) => f.id === report.facilityId)?.tipe ?? ""
                          }
                          onClick={() => handleOpenDetail(report)}
                        />
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </>
              ) : (
                <EmptyState
                  title={
                    activeFilter === "semua" && !query
                      ? "Belum ada laporan"
                      : "Tidak ditemukan"
                  }
                  description={
                    activeFilter === "semua" && !query
                      ? "Laporan yang Anda ajukan akan muncul di sini."
                      : "Coba ubah kata kunci, filter status, atau urutan."
                  }
                />
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            <MaintenancePanel facilities={facilities} onStatusChange={handleFacilityStatusChange} />
            <RecentActivity reports={reports} />
          </div>
        </div>
      </div>

      {selectedReport && (
        <DetailDrawer
          report={selectedReport}
          facility={selectedReportFacility}
          open={!!selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      <ReportFormModal
        key={formOpen ? "open" : "closed"}
        open={formOpen}
        facilities={facilities}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) => {
          handleSubmitReport(data);
        }}
      />
    </main>
  );
}
