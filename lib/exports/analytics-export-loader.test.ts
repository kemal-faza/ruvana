import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getAnalyticsSnapshotMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getAnalyticsSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/services/admin-analytics-service", () => ({ getAnalyticsSnapshot: getAnalyticsSnapshotMock }));

import { AccountStatus, Role } from "@/generated/prisma/enums";
import { STATUS_FASILITAS } from "@/config/business";
import { loadAuthorizedAnalyticsExport } from "@/lib/exports/analytics-export-loader";
import type { AnalyticsSnapshot } from "@/lib/services/admin-analytics-service";

const snapshot: AnalyticsSnapshot = {
  filters: { startDate: "2026-09-01", endDate: "2026-09-26", location: null },
  locations: ["Kampus Utama"],
  metadata: { generatedAt: new Date("2026-09-26T02:00:00.000Z") },
  occupancy: {
    facilityCount: 0,
    dayCount: 26,
    totalApprovedMinutes: 0,
    capacityMinutes: 0,
    occupancyPercent: null,
    unavailableReason: "Tidak ada fasilitas yang cocok.",
  },
  reports: { total: 0, byFacility: [], byCategory: [], byStatus: [] },
  facilityStatuses: STATUS_FASILITAS.reduce(
    (statuses, status) => ({ ...statuses, [status]: [] }),
    {} as AnalyticsSnapshot["facilityStatuses"],
  ),
  methodology: {
    timezone: "Asia/Jakarta",
    minutesPerDay: 780,
    capacityFormula: "Jumlah fasilitas × hari × menit operasional.",
    occupancyFormula: "Menit disetujui ÷ kapasitas × 100%.",
    reservationDateRule: "Tanggal kalender kampus inklusif.",
    approvedStatusRule: "Hanya durasi reservasi disetujui yang dihitung.",
    reportCreationDateRule: "Waktu laporan dipotong pada batas tanggal Jakarta.",
    facilityStatusNote: "Status fasilitas adalah snapshot saat ini.",
  },
};

function adminUser() {
  return {
    id: 1,
    nama: "Admin",
    email: "admin@example.test",
    role: Role.admin,
    status: AccountStatus.ACTIVE,
    waktuDaftar: new Date("2026-01-01T00:00:00.000Z"),
    waktuVerifikasi: null,
  };
}

describe("loadAuthorizedAnalyticsExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(adminUser());
    getAnalyticsSnapshotMock.mockResolvedValue({ ok: true, data: snapshot });
  });

  it("denies anonymous direct requests before querying analytics", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const result = await loadAuthorizedAnalyticsExport(new Request("https://ruvana.test/api/admin/analitik/ekspor/csv"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
    expect(getAnalyticsSnapshotMock).not.toHaveBeenCalled();
  });

  it("denies non-admin direct requests before querying analytics", async () => {
    getSessionUserMock.mockResolvedValue({ ...adminUser(), role: Role.pengguna });

    const result = await loadAuthorizedAnalyticsExport(new Request("https://ruvana.test/api/admin/analitik/ekspor/csv"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
    expect(getAnalyticsSnapshotMock).not.toHaveBeenCalled();
  });

  it("validates duplicate filter parameters before loading data", async () => {
    const request = new Request(
      "https://ruvana.test/api/admin/analitik/ekspor/csv?startDate=2026-09-01&startDate=2026-09-02&endDate=2026-09-26",
    );

    const result = await loadAuthorizedAnalyticsExport(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(422);
      expect(await result.response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
    }
    expect(getAnalyticsSnapshotMock).not.toHaveBeenCalled();
  });

  it("loads and builds the canonical snapshot after admin and filter checks", async () => {
    getAnalyticsSnapshotMock.mockResolvedValue({
      ok: true,
      data: { ...snapshot, filters: { ...snapshot.filters, location: "Kampus Utama" } },
    });
    const request = new Request(
      "https://ruvana.test/api/admin/analitik/ekspor/csv?startDate=2026-09-01&endDate=2026-09-26&location=Kampus+Utama",
    );

    const result = await loadAuthorizedAnalyticsExport(request);

    expect(result.ok).toBe(true);
    expect(getAnalyticsSnapshotMock).toHaveBeenCalledWith({
      startDate: "2026-09-01",
      endDate: "2026-09-26",
      location: "Kampus Utama",
    });
    if (result.ok) {
      expect(result.model.metadata).toMatchObject({
        startDate: "2026-09-01",
        endDate: "2026-09-26",
        location: "Kampus Utama",
        createdAtIso: "2026-09-26T02:00:00.000Z",
      });
      expect(result.model.csvRows.length).toBeGreaterThan(0);
    }
  });

  it("returns snapshot validation errors without building a partial export", async () => {
    getAnalyticsSnapshotMock.mockResolvedValue({
      ok: false,
      errors: [{ field: "location", code: "UNKNOWN_LOCATION", message: "Pilih lokasi." }],
      locations: ["Kampus Utama"],
    });

    const result = await loadAuthorizedAnalyticsExport(
      new Request("https://ruvana.test/api/admin/analitik/ekspor/csv?startDate=2026-09-01&endDate=2026-09-26&location=Asing"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(422);
      expect(await result.response.json()).toMatchObject({
        errors: [{ field: "location", code: "UNKNOWN_LOCATION" }],
      });
    }
  });
});
