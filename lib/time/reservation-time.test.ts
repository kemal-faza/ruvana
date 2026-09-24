import { describe, expect, it } from "vitest";

import {
  asiaJakartaToUtc,
  calendarDateToUtcMidnight,
  formatDateAsiaJakarta,
  formatTimeAsiaJakarta,
  generateAllSlots,
  isPastDate,
  isSlotAligned,
  isValidDateFormat,
  isWithinOperationalHours,
  parseTimeToMinutes,
} from "./reservation-time";

describe("parseTimeToMinutes", () => {
  it("mengonversi jam ke menit dengan benar", () => {
    expect(parseTimeToMinutes("07:00")).toBe(420);
    expect(parseTimeToMinutes("19:30")).toBe(1170);
    expect(parseTimeToMinutes("20:00")).toBe(1200);
  });
});

describe("isSlotAligned", () => {
  it("menerima waktu kelipatan 30 menit", () => {
    expect(isSlotAligned("07:00")).toBe(true);
    expect(isSlotAligned("07:30")).toBe(true);
    expect(isSlotAligned("20:00")).toBe(true);
  });
  it("menolak waktu tidak selaras", () => {
    expect(isSlotAligned("07:15")).toBe(false);
    expect(isSlotAligned("09:10")).toBe(false);
    expect(isSlotAligned("07:00:00")).toBe(false);
  });
});

describe("isWithinOperationalHours", () => {
  it("menerima rentang dalam jam operasional", () => {
    expect(isWithinOperationalHours("07:00", "07:30")).toBe(true);
    expect(isWithinOperationalHours("09:00", "10:00")).toBe(true);
    expect(isWithinOperationalHours("19:30", "20:00")).toBe(true);
  });
  it("menolak di luar jam operasional", () => {
    expect(isWithinOperationalHours("06:30", "07:00")).toBe(false);
    expect(isWithinOperationalHours("19:30", "20:30")).toBe(false);
    expect(isWithinOperationalHours("20:00", "20:30")).toBe(false);
  });
  it("menolak jika start >= end", () => {
    expect(isWithinOperationalHours("10:00", "10:00")).toBe(false);
    expect(isWithinOperationalHours("10:30", "10:00")).toBe(false);
  });
});

describe("isValidDateFormat", () => {
  it("menerima tanggal valid", () => {
    expect(isValidDateFormat("2026-09-15")).toBe(true);
  });
  it("menolak format salah", () => {
    expect(isValidDateFormat("15-09-2026")).toBe(false);
    expect(isValidDateFormat("2026/09/15")).toBe(false);
    expect(isValidDateFormat("2026-02-31")).toBe(false);
  });
});

describe("asiaJakartaToUtc", () => {
  it("mengonversi 09:00 Jakarta ke 02:00 UTC pada tanggal sama", () => {
    const utc = asiaJakartaToUtc("2026-09-15", "09:00");
    expect(utc.toISOString()).toBe("2026-09-15T02:00:00.000Z");
  });
  it("mengonversi 07:00 Jakarta ke 00:00 UTC", () => {
    const utc = asiaJakartaToUtc("2026-09-15", "07:00");
    expect(utc.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });
  it("roundtrip Asia/Jakarta -> UTC -> Asia/Jakarta", () => {
    const utc = asiaJakartaToUtc("2026-09-15", "19:30");
    expect(formatDateAsiaJakarta(utc)).toBe("2026-09-15");
    expect(formatTimeAsiaJakarta(utc)).toBe("19:30");
  });
});

describe("calendarDateToUtcMidnight", () => {
  it("mempertahankan tanggal kalender sebagai UTC midnight untuk kolom DATE", () => {
    expect(calendarDateToUtcMidnight("2026-09-15").toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });
});

describe("generateAllSlots", () => {
  it("menghasilkan 26 slot 07:00-20:00", () => {
    const slots = generateAllSlots();
    expect(slots).toHaveLength(26);
    expect(slots[0]).toEqual({ startTime: "07:00", endTime: "07:30" });
    expect(slots[25]).toEqual({ startTime: "19:30", endTime: "20:00" });
  });
});

describe("isPastDate", () => {
  it("mendeteksi tanggal lampau relatif terhadap now", () => {
    const now = new Date("2026-09-15T02:00:00Z"); // 09:00 Jakarta 15 Sep
    expect(isPastDate("2026-09-14", now)).toBe(true);
    expect(isPastDate("2026-09-15", now)).toBe(false);
    expect(isPastDate("2026-09-16", now)).toBe(false);
  });
});
