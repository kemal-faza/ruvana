import { describe, expect, it } from "vitest";

import { parseAnalyticsFilters } from "@/lib/validation/admin-analytics";

describe("parseAnalyticsFilters", () => {
  it("uses the current Jakarta month through today when no dates are supplied", () => {
    const result = parseAnalyticsFilters({}, new Date("2026-01-31T17:30:00.000Z"));

    expect(result).toEqual({
      ok: true,
      value: { startDate: "2026-02-01", endDate: "2026-02-01", location: null },
    });
  });

  it("accepts an inclusive one-day range and future dates", () => {
    const result = parseAnalyticsFilters(
      { startDate: "2030-05-12", endDate: "2030-05-12", location: "Gedung A" },
      new Date("2026-09-26T00:00:00.000Z"),
    );

    expect(result).toEqual({
      ok: true,
      value: { startDate: "2030-05-12", endDate: "2030-05-12", location: "Gedung A" },
    });
  });

  it("rejects impossible calendar dates with a field-specific message", () => {
    const result = parseAnalyticsFilters({ startDate: "2026-02-30", endDate: "2026-03-01" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: "startDate", code: "INVALID_DATE" }),
      );
    }
  });

  it("rejects an incomplete or reversed date range", () => {
    const incomplete = parseAnalyticsFilters({ startDate: "2026-09-01" });
    const reversed = parseAnalyticsFilters({ startDate: "2026-09-02", endDate: "2026-09-01" });

    expect(incomplete.ok).toBe(false);
    expect(reversed.ok).toBe(false);
    if (!incomplete.ok) {
      expect(incomplete.errors[0]?.message).toMatch(/tanggal awal dan akhir/i);
    }
    if (!reversed.ok) {
      expect(reversed.errors).toContainEqual(
        expect.objectContaining({ field: "startDate", code: "DATE_RANGE_INVALID" }),
      );
    }
  });
});
