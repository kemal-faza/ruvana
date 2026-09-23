import { describe, expect, it } from "vitest";

import { parseMyReservationListQuery, parseReservationId } from "./reservation-query";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parseMyReservationListQuery", () => {
  it("memakai default page 1 dan perPage 20 saat kosong", () => {
    const r = parseMyReservationListQuery(params(""));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.page).toBe(1);
      expect(r.value.perPage).toBe(20);
      expect(r.value.status).toBeUndefined();
    }
  });

  it("menerima page, perPage, dan status valid", () => {
    const r = parseMyReservationListQuery(params("page=2&perPage=10&status=APPROVED"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ page: 2, perPage: 10, status: "APPROVED" });
    }
  });

  it("menerima semua status reservasi yang dikenal", () => {
    for (const status of ["PENDING", "APPROVED", "REJECTED", "CANCELLED_BY_USER", "CANCELLED_BY_OFFICER", "EXPIRED"]) {
      const r = parseMyReservationListQuery(params(`status=${status}`));
      expect(r.ok).toBe(true);
    }
  });

  it("menolak page bukan bilangan bulat positif", () => {
    for (const raw of ["0", "-1", "abc", "1.5"]) {
      const r = parseMyReservationListQuery(params(`page=${raw}`));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => e.field === "page")).toBe(true);
    }
  });

  it("menolak perPage di luar 1..100", () => {
    for (const raw of ["0", "101", "besar"]) {
      const r = parseMyReservationListQuery(params(`perPage=${raw}`));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.some((e) => e.field === "perPage")).toBe(true);
    }
  });

  it("menolak status yang tidak dikenal", () => {
    const r = parseMyReservationListQuery(params("status=DISETUJUI"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.field === "status")).toBe(true);
  });

  it("mengumpulkan banyak error sekaligus", () => {
    const r = parseMyReservationListQuery(params("page=0&status=ANEH"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseReservationId", () => {
  it("menerima id positif", () => {
    expect(parseReservationId("91")).toEqual({ ok: true, value: 91 });
  });

  it("menolak id nol, negatif, atau bukan angka", () => {
    for (const raw of ["0", "-3", "abc", "9.5", ""]) {
      const r = parseReservationId(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0].field).toBe("reservationId");
    }
  });
});
