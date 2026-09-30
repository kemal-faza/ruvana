import { describe, expect, it } from "vitest";

import { parseFacilityStatusBody } from "./facility-status";

describe("parseFacilityStatusBody", () => {
  it("menerima status ACTIVE dan UNDER_MAINTENANCE", () => {
    expect(parseFacilityStatusBody({ status: "ACTIVE" })).toEqual({
      ok: true,
      value: { status: "ACTIVE" },
    });
    expect(parseFacilityStatusBody({ status: "UNDER_MAINTENANCE" })).toEqual({
      ok: true,
      value: { status: "UNDER_MAINTENANCE" },
    });
  });

  it("menolak INACTIVE yang hanya boleh lewat jalur admin FAC-05", () => {
    const result = parseFacilityStatusBody({ status: "INACTIVE" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        expect.objectContaining({ field: "status", code: "INVALID_ENUM" }),
      ]);
    }
  });

  it("menolak status yang hilang atau bukan string", () => {
    for (const body of [{}, { status: 1 }, { status: null }]) {
      const result = parseFacilityStatusBody(body);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toEqual(expect.objectContaining({ field: "status" }));
      }
    }
  });

  it("menolak body yang bukan objek JSON", () => {
    for (const body of [null, [], "ACTIVE", 42]) {
      const result = parseFacilityStatusBody(body);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toEqual(expect.objectContaining({ field: "body", code: "INVALID_BODY" }));
      }
    }
  });

  it("mengabaikan field tambahan di luar kontrak", () => {
    expect(parseFacilityStatusBody({ status: "ACTIVE", catatan: "x" })).toEqual({
      ok: true,
      value: { status: "ACTIVE" },
    });
  });
});
