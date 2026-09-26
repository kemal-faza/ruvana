import { describe, expect, it } from "vitest";

import { parseAnalyticsFilters } from "@/lib/validation/admin-analytics";

describe("parseAnalyticsFilters", () => {
  it("defaults to the current Jakarta month through today and all locations", () => {
    const parsed = parseAnalyticsFilters({}, new Date("2026-09-25T17:30:00.000Z"));

    expect(parsed).toEqual({
      ok: true,
      value: { startDate: "2026-09-01", endDate: "2026-09-26", location: null },
    });
  });

  it("accepts a one-day inclusive period and trims an explicit location", () => {
    const parsed = parseAnalyticsFilters({
      startDate: "2026-09-26",
      endDate: "2026-09-26",
      location: "  Gedung A  ",
    });

    expect(parsed).toEqual({ ok: true, value: { startDate: "2026-09-26", endDate: "2026-09-26", location: "Gedung A" } });
  });

  it("rejects malformed and reversed periods", () => {
    const malformed = parseAnalyticsFilters({ startDate: "2026-02-30", endDate: "2026-03-01" });
    const reversed = parseAnalyticsFilters({ startDate: "2026-09-27", endDate: "2026-09-26" });

    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors).toContainEqual(expect.objectContaining({ field: "startDate", code: "INVALID_DATE" }));
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.errors).toContainEqual(expect.objectContaining({ code: "DATE_RANGE_INVALID" }));
  });

  it("rejects repeated filter parameters", () => {
    const parsed = parseAnalyticsFilters({
      startDate: ["2026-09-01", "2026-09-02"],
      endDate: "2026-09-26",
    });

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors).toContainEqual(expect.objectContaining({ field: "startDate", code: "DUPLICATE_FILTER" }));
  });
});
