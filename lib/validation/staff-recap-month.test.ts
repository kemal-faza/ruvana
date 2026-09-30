import { describe, expect, it } from "vitest";

import {
  formatMonthLabelIndonesia,
  getMonthRange,
  getStaffRecapDefaultMonth,
  listTrendMonths,
  parseStaffRecapMonth,
} from "./staff-recap-month";

// Default bulan berjalan menurut Asia/Jakarta: 2026-09-30 20.00 UTC
// sudah 1 Oktober pukul 03.00 WIB.
const INSTANT_GANTI_BULAN = new Date("2026-09-30T20:00:00.000Z");

describe("getStaffRecapDefaultMonth", () => {
  it("memakai bulan berjalan menurut Asia/Jakarta, bukan UTC", () => {
    expect(getStaffRecapDefaultMonth(INSTANT_GANTI_BULAN)).toBe("2026-10");
  });

  it("memakai bulan UTC saat masih hari yang sama di Jakarta", () => {
    expect(getStaffRecapDefaultMonth(new Date("2026-09-15T10:00:00.000Z"))).toBe("2026-09");
  });
});

describe("parseStaffRecapMonth", () => {
  it("menerima param bulan yang valid tanpa peringatan", () => {
    const hasil = parseStaffRecapMonth({ bulan: "2026-09" }, new Date("2026-09-15T10:00:00.000Z"));

    expect(hasil.month).toBe("2026-09");
    expect(hasil.warning).toBeNull();
  });

  it("memakai default tanpa peringatan saat param tidak ada", () => {
    const hasil = parseStaffRecapMonth({}, INSTANT_GANTI_BULAN);

    expect(hasil.month).toBe("2026-10");
    expect(hasil.warning).toBeNull();
  });

  it("jatuh ke default dengan pesan jelas saat bulan tidak valid", () => {
    for (const bulan of ["2026-13", "2026-9", "september", "", "2026-09-01"]) {
      const hasil = parseStaffRecapMonth({ bulan }, INSTANT_GANTI_BULAN);

      expect(hasil.month).toBe("2026-10");
      expect(hasil.warning).toMatch(/tidak valid/i);
      expect(hasil.warning).toMatch(/Oktober 2026/);
    }
  });

  it("jatuh ke default dengan pesan jelas saat param ganda", () => {
    const hasil = parseStaffRecapMonth({ bulan: ["2026-09", "2026-08"] }, INSTANT_GANTI_BULAN);

    expect(hasil.month).toBe("2026-10");
    expect(hasil.warning).toMatch(/tidak valid/i);
  });
});

describe("formatMonthLabelIndonesia", () => {
  it("menampilkan label bulan dalam bahasa Indonesia", () => {
    expect(formatMonthLabelIndonesia("2026-09")).toBe("September 2026");
    expect(formatMonthLabelIndonesia("2026-01")).toBe("Januari 2026");
  });
});

describe("getMonthRange", () => {
  it("mengembalikan tanggal awal dan akhir bulan kalender", () => {
    expect(getMonthRange("2026-09")).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
  });

  it("menangani Februari tahun kabisat", () => {
    expect(getMonthRange("2024-02")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });
});

describe("listTrendMonths", () => {
  it("mengembalikan 6 bulan terakhir termasuk bulan terpilih", () => {
    expect(listTrendMonths("2026-09")).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("melewati pergantian tahun dengan benar", () => {
    expect(listTrendMonths("2026-01")).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });
});
