import { describe, expect, it } from "vitest";

import { buildIdempotencyScope, canonicalJson, hashCanonicalBody, isValidIdempotencyKey } from "./idempotency";

describe("isValidIdempotencyKey", () => {
  it("menerima UUID valid", () => {
    expect(isValidIdempotencyKey("2c1f4a3e-7e71-4d5c-9f1c-0f0d9e5f1a11")).toBe(true);
  });
  it("menolak null", () => {
    expect(isValidIdempotencyKey(null)).toBe(false);
  });
  it("menolak bukan UUID", () => {
    expect(isValidIdempotencyKey("not-uuid")).toBe(false);
  });
  it("menolak multiple", () => {
    expect(isValidIdempotencyKey("2c1f4a3e-7e71-4d5c-9f1c-0f0d9e5f1a11, 2c1f4a3e-7e71-4d5c-9f1c-0f0d9e5f1a11")).toBe(false);
  });
});

describe("canonicalJson", () => {
  it("menghasilkan string stabil dengan sorted keys", () => {
    const a = canonicalJson({ b: 2, a: 1 });
    const b = canonicalJson({ a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2}');
  });
  it("menangani nested", () => {
    const v = canonicalJson({ z: { b: 2, a: 1 }, a: 1 });
    expect(v).toBe('{"a":1,"z":{"a":1,"b":2}}');
  });
});

describe("hashCanonicalBody", () => {
  it("hash sama untuk objek dengan urutan berbeda", () => {
    const h1 = hashCanonicalBody({ facilityId: 1, date: "2026-09-15", startTime: "09:00", endTime: "10:00", tujuanPenggunaan: "rapat" });
    const h2 = hashCanonicalBody({ tujuanPenggunaan: "rapat", endTime: "10:00", startTime: "09:00", date: "2026-09-15", facilityId: 1 });
    expect(h1).toBe(h2);
  });
  it("hash berbeda untuk payload berbeda", () => {
    const h1 = hashCanonicalBody({ facilityId: 1, date: "2026-09-15" });
    const h2 = hashCanonicalBody({ facilityId: 2, date: "2026-09-15" });
    expect(h1).not.toBe(h2);
  });
});

describe("buildIdempotencyScope", () => {
  it("membangun scope POST:/api/reservations", () => {
    expect(buildIdempotencyScope("POST", "/api/reservations")).toBe("POST:/api/reservations");
  });
});
