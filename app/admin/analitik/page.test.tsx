import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getAnalyticsLocations, getAnalyticsSnapshot } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getAnalyticsLocations: vi.fn(),
  getAnalyticsSnapshot: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/services/admin-analytics-service", () => ({ getAnalyticsLocations, getAnalyticsSnapshot }));

import AdminAnalitikPage from "@/app/admin/analitik/page";

beforeEach(() => vi.clearAllMocks());

describe("AdminAnalitikPage", () => {
  it("authorizes before requesting any analytics dataset", async () => {
    requireAdmin.mockRejectedValue(new Error("redirect"));

    await expect(
      AdminAnalitikPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(getAnalyticsLocations).not.toHaveBeenCalled();
    expect(getAnalyticsSnapshot).not.toHaveBeenCalled();
  });

  it("preserves location options when rejecting an invalid date range", async () => {
    requireAdmin.mockResolvedValue({ id: 1, nama: "Admin", email: "admin@example.test", role: "admin" });
    getAnalyticsLocations.mockResolvedValue(["Kampus A", "Kampus B"]);

    const page = await AdminAnalitikPage({
      searchParams: Promise.resolve({
        startDate: "2026-09-03",
        endDate: "2026-09-01",
        location: "Kampus A",
      }),
    });

    expect(getAnalyticsLocations).toHaveBeenCalledOnce();
    expect(getAnalyticsSnapshot).not.toHaveBeenCalled();
    expect(page.props.locations).toEqual(["Kampus A", "Kampus B"]);
    expect(page.props.filters.location).toBe("Kampus A");
    expect(page.props.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DATE_RANGE_INVALID" })]),
    );
  });
});
