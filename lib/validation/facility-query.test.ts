import { describe, expect, it } from "vitest";

import { cleanSearchParams, parseAvailabilityDate, parseFacilityId, parsePublicListQuery } from "./facility-query";

describe("parsePublicListQuery", () => {
  it("memakai default page=1 dan perPage=20 ketika tidak ada parameter", () => {
    const result = parsePublicListQuery(new URLSearchParams());
    expect(result).toEqual({ ok: true, value: { page: 1, perPage: 20 } });
  });

  it("menerima page dan perPage yang valid", () => {
    const result = parsePublicListQuery(new URLSearchParams("page=2&perPage=50"));
    expect(result).toEqual({ ok: true, value: { page: 2, perPage: 50 } });
  });

  it("mengabaikan filter yang tidak dikirim", () => {
    const result = parsePublicListQuery(new URLSearchParams());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty("search");
      expect(result.value).not.toHaveProperty("type");
      expect(result.value).not.toHaveProperty("location");
      expect(result.value).not.toHaveProperty("minCapacity");
    }
  });

  it("menerima search, type, location, dan minCapacity yang valid", () => {
    const result = parsePublicListQuery(
      new URLSearchParams("search=lab&type=laboratorium&location=Gedung&minCapacity=30"),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        page: 1,
        perPage: 20,
        search: "lab",
        type: "laboratorium",
        location: "Gedung",
        minCapacity: 30,
      },
    });
  });

  it("memangkas spasi di sekitar search dan location", () => {
    const result = parsePublicListQuery(new URLSearchParams("search=  lab  &location=  Gedung A  "));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.search).toBe("lab");
      expect(result.value.location).toBe("Gedung A");
    }
  });

  it("menolak search kosong dengan code TOO_SHORT", () => {
    const result = parsePublicListQuery(new URLSearchParams("search=   "));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "search", code: "TOO_SHORT" });
    }
  });

  it("menolak search lebih dari 200 karakter dengan code TOO_LONG", () => {
    const result = parsePublicListQuery(new URLSearchParams(`search=${"a".repeat(201)}`));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "search", code: "TOO_LONG" });
    }
  });

  it("menolak type di luar enum dengan code INVALID_ENUM", () => {
    const result = parsePublicListQuery(new URLSearchParams("type=gedung"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "type", code: "INVALID_ENUM" });
    }
  });

  it("menolak location kosong dengan code TOO_SHORT", () => {
    const result = parsePublicListQuery(new URLSearchParams("location=   "));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "location", code: "TOO_SHORT" });
    }
  });

  it("menolak location lebih dari 200 karakter dengan code TOO_LONG", () => {
    const result = parsePublicListQuery(new URLSearchParams(`location=${"a".repeat(201)}`));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "location", code: "TOO_LONG" });
    }
  });

  it("menolak minCapacity bukan angka dengan code INVALID_INTEGER", () => {
    const result = parsePublicListQuery(new URLSearchParams("minCapacity=abc"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "minCapacity", code: "INVALID_INTEGER" });
    }
  });

  it("menolak minCapacity kurang dari 1 dengan code OUT_OF_RANGE", () => {
    const result = parsePublicListQuery(new URLSearchParams("minCapacity=0"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "minCapacity", code: "OUT_OF_RANGE" });
    }
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

describe("cleanSearchParams", () => {
  it("membuang parameter yang nilainya kosong atau hanya spasi", () => {
    const cleaned = cleanSearchParams(new URLSearchParams("search=&type=laboratorium&location=   "));
    expect(cleaned.toString()).toBe("type=laboratorium");
  });

  it("mempertahankan parameter yang terisi", () => {
    const cleaned = cleanSearchParams(new URLSearchParams("page=2&search=lab"));
    expect(cleaned.get("page")).toBe("2");
    expect(cleaned.get("search")).toBe("lab");
  });

  it("tidak mengubah instance asli", () => {
    const original = new URLSearchParams("search=");
    cleanSearchParams(original);
    expect(original.has("search")).toBe(true);
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
