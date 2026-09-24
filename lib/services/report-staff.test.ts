import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  countReportsByUser,
  countStaffReportsByStatus,
  findReportsByStatus,
} from "@/lib/db/reports";

import { listStaffReportWork } from "./report-service";

vi.mock("@/lib/db/reports", () => ({
  countReportsByUser: vi.fn(),
  countStaffReportsByStatus: vi.fn(),
  createReport: vi.fn(),
  findDefaultReportOwner: vi.fn(),
  findFacilityById: vi.fn(),
  findReportFacilityOptions: vi.fn(),
  findReportsByStatus: vi.fn(),
  findReportsByUser: vi.fn(),
  findUsersById: vi.fn(),
}));

const row = {
  id: 14,
  kategori: "Listrik",
  deskripsi: "Lampu lorong mati",
  status: "NEW" as const,
  createdAt: new Date("2026-09-24T03:00:00.000Z"),
  facility: { nama: "Gedung B" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listStaffReportWork", () => {
  it("mengambil semua pekerjaan NEW dan IN_PROGRESS dengan hitungan terpisah", async () => {
    vi.mocked(findReportsByStatus).mockImplementation(({ status }) =>
      Promise.resolve(status === "NEW" ? [row] : [{ ...row, id: 15, status: "IN_PROGRESS" }]) as never,
    );
    vi.mocked(countStaffReportsByStatus).mockImplementation((status) =>
      Promise.resolve(status === "NEW" ? 5 : 2) as never,
    );

    const result = await listStaffReportWork();

    expect(findReportsByStatus).toHaveBeenCalledWith({ status: "NEW", skip: 0, take: 3 });
    expect(findReportsByStatus).toHaveBeenCalledWith({ status: "IN_PROGRESS", skip: 0, take: 3 });
    expect(countStaffReportsByStatus).toHaveBeenCalledWith("NEW");
    expect(countStaffReportsByStatus).toHaveBeenCalledWith("IN_PROGRESS");
    expect(countReportsByUser).not.toHaveBeenCalled();
    expect(result.NEW).toMatchObject({ total: 5, items: [{ id: 14, facilityNama: "Gedung B", status: "NEW" }] });
    expect(result.IN_PROGRESS).toMatchObject({
      total: 2,
      items: [{ id: 15, facilityNama: "Gedung B", status: "IN_PROGRESS" }],
    });
  });

  it("tidak menampilkan foto atau data pelapor pada pratinjau", async () => {
    vi.mocked(findReportsByStatus).mockResolvedValue([row] as never);
    vi.mocked(countStaffReportsByStatus).mockResolvedValue(1 as never);

    const result = await listStaffReportWork();

    expect(result.NEW.items[0]).not.toHaveProperty("fotoPath");
    expect(result.NEW.items[0]).not.toHaveProperty("userId");
  });
});
