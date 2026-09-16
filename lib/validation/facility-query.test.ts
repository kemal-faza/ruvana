import { describe, expect, it } from "vitest";

import { parseFacilityId, parsePublicListQuery } from "./facility-query";

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
