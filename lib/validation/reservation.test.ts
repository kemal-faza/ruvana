import { describe, expect, it } from "vitest";

import { parseReservationCreateBody } from "./reservation";

describe("parseReservationCreateBody", () => {
  const baseValid = {
    facilityId: 1,
    date: "2026-09-15",
    startTime: "09:00",
    endTime: "10:00",
    tujuanPenggunaan: "Diskusi kelompok",
  };

  it("menerima body valid", () => {
    const r = parseReservationCreateBody(baseValid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.facilityId).toBe(1);
      expect(r.value.date).toBe("2026-09-15");
    }
  });

  it("menolak body bukan objek", () => {
    const r = parseReservationCreateBody(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("body");
  });

  it("menolak facilityId tidak valid", () => {
    const r = parseReservationCreateBody({ ...baseValid, facilityId: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "facilityId")).toBe(true);
  });

  it("menolak date format salah", () => {
    const r = parseReservationCreateBody({ ...baseValid, date: "15-09-2026" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "date")).toBe(true);
  });

  it("menolak startTime tidak selaras", () => {
    const r = parseReservationCreateBody({ ...baseValid, startTime: "09:10" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "startTime")).toBe(true);
  });

  it("menolak endTime sebelum startTime", () => {
    const r = parseReservationCreateBody({ ...baseValid, startTime: "10:00", endTime: "09:30" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("menolak rentang di luar operasional 07:00-20:00", () => {
    const r = parseReservationCreateBody({ ...baseValid, startTime: "07:00", endTime: "20:30" as string });
    expect(r.ok).toBe(false);
  });

  it("menolak tujuan kosong", () => {
    const r = parseReservationCreateBody({ ...baseValid, tujuanPenggunaan: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "tujuanPenggunaan")).toBe(true);
  });

  it("menolak tujuan melebihi 500 karakter", () => {
    const long = "a".repeat(501);
    const r = parseReservationCreateBody({ ...baseValid, tujuanPenggunaan: long });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "TOO_LONG")).toBe(true);
  });

  it("trim tujuanPenggunaan", () => {
    const r = parseReservationCreateBody({ ...baseValid, tujuanPenggunaan: "  rapat  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tujuanPenggunaan).toBe("rapat");
  });

  it("menolak startTime 06:30 di luar operasional", () => {
    const r = parseReservationCreateBody({ ...baseValid, startTime: "06:30" as string, endTime: "07:00" });
    expect(r.ok).toBe(false);
  });

  it("menerima batas tepat 07:00-20:00", () => {
    const r = parseReservationCreateBody({ ...baseValid, startTime: "07:00", endTime: "20:00" });
    expect(r.ok).toBe(true);
  });
});
