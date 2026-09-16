import { describe, expect, it } from "vitest";

import {
  formatJakartaTime,
  jakartaDayRangeUtc,
  jakartaToUtc,
  parseCalendarDate,
  todayJakarta,
} from "./jakarta";

describe("parseCalendarDate", () => {
  it("mem-parse tanggal kalender yang valid", () => {
    expect(parseCalendarDate("2026-09-15")).toEqual({ year: 2026, month: 9, day: 15 });
  });

  it("menolak tanggal kalender yang tidak ada (30 Februari)", () => {
    expect(parseCalendarDate("2026-02-30")).toBeNull();
  });

  it("menolak format yang salah", () => {
    expect(parseCalendarDate("15-09-2026")).toBeNull();
    expect(parseCalendarDate("2026/09/15")).toBeNull();
    expect(parseCalendarDate("")).toBeNull();
  });

  it("menolak bulan di luar rentang 1-12", () => {
    expect(parseCalendarDate("2026-13-01")).toBeNull();
  });
});

describe("jakartaToUtc", () => {
  it("mengonversi 07:00 WIB menjadi 00:00Z pada tanggal yang sama", () => {
    const result = jakartaToUtc({ year: 2026, month: 9, day: 15 }, "07:00");
    expect(result.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("mengonversi 19:30 WIB menjadi 12:30Z", () => {
    const result = jakartaToUtc({ year: 2026, month: 9, day: 15 }, "19:30");
    expect(result.toISOString()).toBe("2026-09-15T12:30:00.000Z");
  });
});

describe("jakartaDayRangeUtc", () => {
  it("batas hari 00:00 WIB jatuh pada 17:00Z hari sebelumnya", () => {
    const { start, end } = jakartaDayRangeUtc({ year: 2026, month: 9, day: 15 });
    expect(start.toISOString()).toBe("2026-09-14T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-15T17:00:00.000Z");
  });

  it("rentang bersifat setengah terbuka selama tepat 24 jam", () => {
    const { start, end } = jakartaDayRangeUtc({ year: 2026, month: 9, day: 15 });
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("formatJakartaTime", () => {
  it("memformat instant UTC menjadi jam WIB HH:MM", () => {
    expect(formatJakartaTime(new Date("2026-09-15T00:00:00.000Z"))).toBe("07:00");
    expect(formatJakartaTime(new Date("2026-09-15T12:30:00.000Z"))).toBe("19:30");
  });
});

describe("todayJakarta", () => {
  it("mengembalikan tanggal kalender WIB untuk instant yang diberikan", () => {
    expect(todayJakarta(new Date("2026-09-15T00:00:00.000Z"))).toBe("2026-09-15");
  });

  it("melewati tengah malam WIB sebelum UTC (17:30Z sehari sebelumnya sudah jadi hari berikutnya di WIB)", () => {
    expect(todayJakarta(new Date("2026-09-14T17:30:00.000Z"))).toBe("2026-09-15");
    expect(todayJakarta(new Date("2026-09-14T16:30:00.000Z"))).toBe("2026-09-14");
  });
});
