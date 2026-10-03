import { describe, expect, it } from "vitest";

import { getJakartaAnalyticsDateRange } from "@/lib/time/analytics-date-range";

describe("getJakartaAnalyticsDateRange", () => {
  it("converts the inclusive Jakarta calendar range to UTC [start, next-day)", () => {
    const range = getJakartaAnalyticsDateRange("2026-09-01", "2026-09-03");

    expect(range.startAt.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(range.endAtExclusive.toISOString()).toBe("2026-09-03T17:00:00.000Z");
  });

  it("advances by a calendar day across leap day", () => {
    const range = getJakartaAnalyticsDateRange("2024-02-29", "2024-02-29");

    expect(range.startAt.toISOString()).toBe("2024-02-28T17:00:00.000Z");
    expect(range.endAtExclusive.toISOString()).toBe("2024-02-29T17:00:00.000Z");
  });

  it("keeps a valid one-day range near the maximum supported four-digit input year", () => {
    const range = getJakartaAnalyticsDateRange("9999-12-31", "9999-12-31");

    expect(range.endAtExclusive.getTime() - range.startAt.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
