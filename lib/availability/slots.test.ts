import { describe, expect, it } from "vitest";

import { jakartaToUtc } from "@/lib/time/jakarta";

import { computeAvailability, generateDailySlots } from "./slots";

const DATE = { year: 2026, month: 9, day: 15 };

describe("generateDailySlots", () => {
  it("menghasilkan tepat 26 slot", () => {
    expect(generateDailySlots()).toHaveLength(26);
  });

  it("dimulai 07:00-07:30 dan berakhir 19:30-20:00", () => {
    const slots = generateDailySlots();
    expect(slots[0]).toEqual({ startTime: "07:00", endTime: "07:30" });
    expect(slots[25]).toEqual({ startTime: "19:30", endTime: "20:00" });
  });
});

describe("computeAvailability", () => {
  it("semua tersedia tanpa reservasi APPROVED", () => {
    const slots = computeAvailability({ date: DATE, status: "ACTIVE", approvedIntervals: [] });

    expect(slots).toHaveLength(26);
    expect(slots.every((slot) => slot.available && slot.blockedBy === null)).toBe(true);
  });

  it("UNDER_MAINTENANCE menandai semua 26 slot sebagai MAINTENANCE dan tidak tersedia", () => {
    const slots = computeAvailability({
      date: DATE,
      status: "UNDER_MAINTENANCE",
      approvedIntervals: [{ startTime: jakartaToUtc(DATE, "08:00"), endTime: jakartaToUtc(DATE, "09:00") }],
    });

    expect(slots).toHaveLength(26);
    expect(slots.every((slot) => !slot.available && slot.blockedBy === "MAINTENANCE")).toBe(true);
  });

  it("reservasi APPROVED 08:00-09:00 memblokir tepat 2 slot (08:00-08:30, 08:30-09:00)", () => {
    const slots = computeAvailability({
      date: DATE,
      status: "ACTIVE",
      approvedIntervals: [{ startTime: jakartaToUtc(DATE, "08:00"), endTime: jakartaToUtc(DATE, "09:00") }],
    });

    const blocked = slots.filter((slot) => !slot.available);
    expect(blocked.map((slot) => slot.startTime)).toEqual(["08:00", "08:30"]);
    expect(blocked.every((slot) => slot.blockedBy === "APPROVED")).toBe(true);
  });

  it("reservasi yang berakhir tepat 08:00 tidak memblokir slot 08:00-08:30", () => {
    const slots = computeAvailability({
      date: DATE,
      status: "ACTIVE",
      approvedIntervals: [{ startTime: jakartaToUtc(DATE, "07:30"), endTime: jakartaToUtc(DATE, "08:00") }],
    });

    const slot0800 = slots.find((slot) => slot.startTime === "08:00");
    expect(slot0800).toEqual({ startTime: "08:00", endTime: "08:30", available: true, blockedBy: null });
  });
});
