import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AdminAnalyticsDashboard from "@/components/admin/AdminAnalytics";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const filters = { startDate: "2026-09-01", endDate: "2026-09-02", location: "" };

const snapshot: AnalyticsSnapshot = {
  filters: { startDate: "2026-09-01", endDate: "2026-09-02", location: null },
  locations: ["Gedung A", "Gedung B"],
  metadata: { generatedAt: new Date("2026-09-02T04:00:00.000Z") },
  occupancy: {
    facilityCount: 3,
    dayCount: 2,
    totalApprovedMinutes: 120,
    capacityMinutes: 4680,
    occupancyPercent: (120 / 4680) * 100,
    unavailableReason: null,
  },
  facilityStatuses: {
    ACTIVE: ["Ruang Alfa"],
    UNDER_MAINTENANCE: ["Aula Utama"],
    INACTIVE: ["Laboratorium Lama"],
  },
  reports: {
    total: 8,
    byFacility: [
      { facilityId: 1, label: "Ruang Alfa", count: 4 },
      { facilityId: 2, label: "Aula Utama", count: 4 },
    ],
    byCategory: [
      { label: "Listrik", count: 5 },
      { label: "Peralatan", count: 3 },
    ],
    byStatus: [
      { status: "NEW", label: "Baru", count: 4 },
      { status: "IN_PROGRESS", label: "Diproses", count: 2 },
      { status: "RESOLVED", label: "Selesai", count: 2 },
    ],
  },
  methodology: {
    timezone: "Asia/Jakarta",
    minutesPerDay: 780,
    capacityFormula: "Jumlah fasilitas × jumlah hari kalender inklusif × menit operasional per hari.",
    occupancyFormula: "Total menit reservasi APPROVED ÷ kapasitas periode × 100%.",
    reservationDateRule: "Reservasi dihitung berdasarkan tanggal kalender kampus (Asia/Jakarta) dalam rentang inklusif.",
    approvedStatusRule: "Hanya durasi reservasi berstatus APPROVED yang masuk ke pembilang.",
    facilityStatusNote:
      "Status fasilitas adalah snapshot saat ini. Histori status belum tersedia; fasilitas dalam perbaikan dan nonaktif tetap masuk kapasitas.",
    reportCreationDateRule: "Laporan dihitung berdasarkan waktu dibuat dalam kalender Asia/Jakarta.",
  },
};

afterEach(cleanup);

describe("AdminAnalyticsDashboard", () => {
  it("renders Jakarta filters, occupancy figures, methodology, and the current status table", () => {
    render(<AdminAnalyticsDashboard filters={filters} locations={snapshot.locations} snapshot={snapshot} errors={[]} />);

    expect(screen.getByRole("heading", { name: "Analitik" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tanggal awal")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Tanggal akhir")).toHaveValue("2026-09-02");
    expect(screen.getByLabelText("Lokasi")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Gedung A" })).toBeInTheDocument();
    expect(screen.getByText("2,6%")).toBeInTheDocument();
    expect(screen.getByText("4.680 menit")).toBeInTheDocument();
    expect(screen.getByText(/hanya durasi reservasi berstatus approved/i)).toBeInTheDocument();
    expect(screen.getAllByText(/histori status belum tersedia/i)).toHaveLength(2);

    expect(screen.getByText("8 laporan")).toBeInTheDocument();
    expect(screen.getByText(/waktu dibuat dalam kalender asia\/jakarta/i)).toBeInTheDocument();
    const facilityReportTable = screen.getByRole("table", { name: "Laporan menurut fasilitas" });
    expect(facilityReportTable).toHaveTextContent("Aula Utama");
    expect(within(facilityReportTable).getAllByRole("row")).toHaveLength(3);
    const categoryReportTable = screen.getByRole("table", { name: "Laporan menurut kategori" });
    expect(categoryReportTable).toHaveTextContent("Listrik");
    expect(within(categoryReportTable).getAllByRole("row")).toHaveLength(3);
    const statusTable = screen.getByRole("table", { name: "Laporan menurut status" });
    expect(statusTable).toHaveTextContent("Baru");
    expect(statusTable).toHaveTextContent("Diproses");
    expect(statusTable).not.toHaveTextContent("IN_PROGRESS");
    expect(within(statusTable).getAllByRole("row")).toHaveLength(4);

    const table = screen.getByRole("table", { name: "Daftar fasilitas menurut status saat ini" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(within(rows[1]!).getByText("Aktif")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Dalam Perbaikan")).toBeInTheDocument();
    expect(within(rows[3]!).getByText("Nonaktif")).toBeInTheDocument();
    expect(within(table).getByText("Aula Utama")).toBeInTheDocument();
  });

  it("shows field-level filter feedback without rendering a snapshot", () => {
    render(
      <AdminAnalyticsDashboard
        filters={{ startDate: "2026-09-03", endDate: "2026-09-01", location: "" }}
        locations={[]}
        snapshot={null}
        errors={[{ field: "startDate", code: "DATE_RANGE_INVALID", message: "Tanggal awal harus sebelum tanggal akhir." }]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Tanggal awal harus sebelum tanggal akhir.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps the selected location in the filter while date errors are shown", () => {
    render(
      <AdminAnalyticsDashboard
        filters={{ startDate: "2026-09-03", endDate: "2026-09-01", location: "Gedung A" }}
        locations={["Gedung A", "Gedung B"]}
        snapshot={null}
        errors={[{ field: "startDate", code: "DATE_RANGE_INVALID", message: "Tanggal awal harus sebelum tanggal akhir." }]}
      />,
    );

    expect(screen.getByLabelText("Lokasi")).toHaveValue("Gedung A");
    expect(screen.getByRole("option", { name: "Gedung A" })).toBeInTheDocument();
  });

  it("labels zero capacity as not computable and keeps the reason and method visible", () => {
    const emptySnapshot: AnalyticsSnapshot = {
      ...snapshot,
      locations: [],
      occupancy: {
        facilityCount: 0,
        dayCount: 2,
        totalApprovedMinutes: 0,
        capacityMinutes: 0,
        occupancyPercent: null,
        unavailableReason: "Tidak ada fasilitas yang cocok dengan lokasi ini.",
      },
      facilityStatuses: { ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] },
      reports: { total: 0, byFacility: [], byCategory: [], byStatus: [] },
    };

    render(<AdminAnalyticsDashboard filters={filters} locations={[]} snapshot={emptySnapshot} errors={[]} />);

    expect(screen.getByText("Tidak dapat dihitung")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada fasilitas yang cocok dengan lokasi ini.")).toBeInTheDocument();
    expect(screen.getAllByText(/kapasitas periode/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Tidak ada fasilitas untuk lokasi ini.")).toBeInTheDocument();
    expect(screen.getByText("0 laporan")).toBeInTheDocument();
    expect(screen.getAllByText("Belum ada laporan pada periode dan lokasi ini.")).toHaveLength(3);
  });
});
