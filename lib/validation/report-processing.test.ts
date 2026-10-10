import { describe, expect, it } from "vitest";

import { MAKS_CATATAN_RESOLUSI_LAPORAN } from "@/config/business";

import {
  ANTREAN_LAPORAN,
  URUTAN_LAPORAN,
  parseAntreanDanUrutan,
  parseReportId,
  parseReportResolutionBody,
  parseStaffReportQueueQuery,
} from "./report-processing";

describe("parseReportId", () => {
  it("menerima bilangan bulat positif", () => {
    expect(parseReportId("15")).toEqual({ ok: true, value: 15 });
  });

  it("menerima nol di depan", () => {
    expect(parseReportId("007")).toEqual({ ok: true, value: 7 });
  });

  it("menolak identifier yang tidak valid", () => {
    for (const raw of ["0", "-1", "abc", "1.5", ""]) {
      expect(parseReportId(raw).ok).toBe(false);
    }
  });

  it("menolak id ber-spasi, bertanda, bernotasi, dan di luar safe integer", () => {
    for (const raw of [" 15", "15 ", "+15", "1e3", "99999999999999999999"]) {
      expect(parseReportId(raw).ok).toBe(false);
    }
  });
});

describe("parseStaffReportQueueQuery", () => {
  it("memberikan default halaman, per halaman, dan urutan terlama", () => {
    const result = parseStaffReportQueueQuery(new URLSearchParams("queue=intake"));
    expect(result).toEqual({ ok: true, value: { queue: "intake", urut: "terlama", page: 1, perPage: 20 } });
  });

  it("menerima semua nilai antrean dan urutan", () => {
    for (const queue of ANTREAN_LAPORAN) {
      expect(parseStaffReportQueueQuery(new URLSearchParams(`queue=${queue}`)).ok).toBe(true);
    }
    for (const urut of URUTAN_LAPORAN) {
      expect(parseStaffReportQueueQuery(new URLSearchParams(`queue=work&sort=${urut}`)).ok).toBe(true);
    }
  });

  it("mewajibkan antrean yang dikenal", () => {
    expect(parseStaffReportQueueQuery(new URLSearchParams()).ok).toBe(false);
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=all")).ok).toBe(false);
  });

  it("menolak urutan yang tidak dikenal", () => {
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=intake&sort=lama")).ok).toBe(false);
  });

  it("menolak nilai halaman di luar rentang", () => {
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=work&page=0")).ok).toBe(false);
    expect(parseStaffReportQueueQuery(new URLSearchParams("queue=work&perPage=101")).ok).toBe(false);
  });
});

describe("parseAntreanDanUrutan", () => {
  it("membaca antrean dan urutan dari URL", () => {
    expect(parseAntreanDanUrutan({ queue: "riwayat", sort: "terbaru" })).toEqual({
      queue: "riwayat",
      urut: "terbaru",
    });
  });

  it("memakai nilai bawaan saat parameter hilang atau tidak dikenal", () => {
    expect(parseAntreanDanUrutan({})).toEqual({ queue: "intake", urut: "terlama" });
    expect(parseAntreanDanUrutan({ queue: ["all"], sort: ["lama"] })).toEqual({ queue: "intake", urut: "terlama" });
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
