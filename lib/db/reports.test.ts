import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCount, mockFindMany } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { report: { count: mockCount, findMany: mockFindMany } },
}));

import { countStaffReportsByStatus, findReportsByStatus } from "./reports";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("kueri pekerjaan laporan Petugas", () => {
  it("mengambil laporan untuk suatu status dari seluruh pemilik, terbaru lebih dahulu", () => {
    findReportsByStatus({ status: "IN_PROGRESS", skip: 0, take: 3 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "IN_PROGRESS" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 3,
      }),
    );
    const [query] = mockFindMany.mock.calls[0] as [{ where: Record<string, unknown>; select: Record<string, unknown> }];
    expect(query.where).not.toHaveProperty("userId");
    expect(query.select).not.toHaveProperty("foto");
  });

  it("menghitung status lintas pemilik", () => {
    countStaffReportsByStatus("NEW");

    expect(mockCount).toHaveBeenCalledWith({ where: { status: "NEW" } });
  });
});
