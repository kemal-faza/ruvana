import { describe, expect, it } from "vitest";

import { parseAvailabilityDate, parseFacilityId, parsePublicListQuery } from "./facility-query";

describe("parsePublicListQuery", () => {
  it("memakai default page=1 dan perPage=20 ketika tidak ada parameter", () => {
    const result = parsePublicListQuery(new URLSearchParams());
    expect(result).toEqual({ ok: true, value: { page: 1, perPage: 20 } });
  });

  it("menerima page dan perPage yang valid", () => {
    const result = parsePublicListQuery(new URLSearchParams("page=2&perPage=50"));
    expect(result).toEqual({ ok: true, value: { page: 2, perPage: 50 } });
  });

  it("menolak perPage di luar batas 1-100", () => {
    const result = parsePublicListQuery(new URLSearchParams("perPage=0"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "perPage" });
    }
  });

  it("menolak perPage di atas 100", () => {
    const result = parsePublicListQuery(new URLSearchParams("perPage=101"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "perPage" });
    }
  });

  it("menolak page bukan angka", () => {
    const result = parsePublicListQuery(new URLSearchParams("page=abc"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "page" });
    }
  });

  it("menolak page kurang dari 1", () => {
    const result = parsePublicListQuery(new URLSearchParams("page=0"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "page" });
    }
  });
});

describe("parseFacilityId", () => {
  it("menerima id positif", () => {
    expect(parseFacilityId("5")).toEqual({ ok: true, value: 5 });
  });

  it("menolak id bukan angka", () => {
    const result = parseFacilityId("abc");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "facilityId" });
    }
  });

  it("menolak id nol atau negatif", () => {
    expect(parseFacilityId("0").ok).toBe(false);
  });
});

describe("parseAvailabilityDate", () => {
  it("menerima tanggal kalender yang valid", () => {
    expect(parseAvailabilityDate("2026-09-15")).toEqual({ ok: true, value: "2026-09-15" });
  });

  it("menolak ketika date tidak dikirim", () => {
    const result = parseAvailabilityDate(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "date", code: "REQUIRED" });
    }
  });

  it("menolak format yang salah", () => {
    const result = parseAvailabilityDate("15-09-2026");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "date", code: "INVALID_DATE" });
    }
  });

  it("menolak tanggal kalender yang tidak ada", () => {
    const result = parseAvailabilityDate("2026-02-30");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "date", code: "INVALID_DATE" });
    }
  });
});
