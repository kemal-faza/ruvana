import { describe, expect, it } from "vitest";

import { MAKS_CATATAN_RESOLUSI_LAPORAN } from "@/config/business";

import {
  ANTREAN_LAPORAN,
  parseReportId,
  parseReportResolutionBody,
  parseStaffReportQueueQuery,
} from "./report-processing";

describe("parseReportId", () => {
  it("menerima bilangan bulat positif", () => {
    expect(parseReportId("15")).toEqual({ ok: true, value: 15 });
  });

  it("menolak identifier yang tidak valid", () => {
    for (const raw of ["0", "-1", "abc", "1.5", ""]) {
      expect(parseReportId(raw).ok).toBe(false);
    }
  });
});

describe("parseStaffReportQueueQuery", () => {
  it("memberikan default halaman dan per halaman", () => {
    const result = parseStaffReportQueueQuery(new URLSearchParams("queue=intake"));
    expect(result).toEqual({ ok: true, value: { queue: "intake", page: 1, perPage: 20 } });
  });

  it("menerima kedua nilai antrean", () => {
    for (const queue of ANTREAN_LAPORAN) {
      expect(parseStaffReportQueueQuery(new URLSearchParams(`queue=${queue}`)).ok).toBe(true);
    }
  });

  it("mewajibkan antrean yang dikenal", () => {
    expect(parseStaffReportQueueQuery(new URLSearchParams()).ok).toBe(false);
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=all")).ok).toBe(false);
  });

  it("menolak nilai halaman di luar rentang", () => {
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=work&page=0")).ok).toBe(false);
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=work&perPage=101")).ok).toBe(false);
  });
});

describe("parseReportResolutionBody", () => {
  it("menerima catatan yang terisi dan memangkas spasi", () => {
    expect(parseReportResolutionBody({ catatanResolusi: "  Lampu diganti.  " })).toEqual({
      ok: true,
      value: { catatanResolusi: "Lampu diganti." },
    });
  });

  it("menolak body yang bukan objek", () => {
    expect(parseReportResolutionBody(null).ok).toBe(false);
    expect(parseReportResolutionBody("catatan").ok).toBe(false);
  });

  it("menuntut catatan penyelesaian tidak kosong", () => {
    const kosong = parseReportResolutionBody({ catatanResolusi: "   " });
    expect(kosong.ok).toBe(false);
    if (!kosong.ok) {
      expect(kosong.errors[0].field).toBe("catatanResolusi");
    }
  });

  it("menolak catatan melebihi batas", () => {
    const result = parseReportResolutionBody({ catatanResolusi: "x".repeat(MAKS_CATATAN_RESOLUSI_LAPORAN + 1) });
    expect(result.ok).toBe(false);
  });

  it("menolak field di luar ResolutionRequest", () => {
    const result = parseReportResolutionBody({ catatanResolusi: "Lampu diganti.", alasan: "alasan lain" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field)).toContain("alasan");
    }
  });
});