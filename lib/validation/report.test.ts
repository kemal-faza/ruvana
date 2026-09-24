import { describe, expect, it } from "vitest";

import { validateReportSubmission } from "./report";

const validBase = {
  facilityId: 3,
  kategori: "Listrik",
  deskripsi: "Saklar di ruang 101 mati",
  hasFoto: true,
  fotoType: "image/jpeg",
  fotoSize: 200_000,
};

describe("validateReportSubmission", () => {
  it("menerima laporan yang valid", () => {
    expect(validateReportSubmission(validBase)).toEqual({ ok: true });
  });

  it("membutuhkan fasilitas", () => {
    const result = validateReportSubmission({ ...validBase, facilityId: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.facilityId).toBeTruthy();
    }
  });

  it("menolak fasilitas bukan angka positif", () => {
    const result = validateReportSubmission({ ...validBase, facilityId: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.facilityId).toBeTruthy();
    }
  });

  it("membutuhkan kategori", () => {
    const result = validateReportSubmission({ ...validBase, kategori: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.kategori).toBeTruthy();
    }
  });

  it("menolak kategori di luar daftar PRD", () => {
    const result = validateReportSubmission({ ...validBase, kategori: "Internet" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.kategori).toBeTruthy();
    }
  });

  it("membutuhkan deskripsi setelah trim", () => {
    const result = validateReportSubmission({ ...validBase, deskripsi: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.deskripsi).toBeTruthy();
    }
  });

  it("menolak deskripsi melebihi 2.000 karakter", () => {
    const result = validateReportSubmission({ ...validBase, deskripsi: "a".repeat(2001) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.deskripsi).toBeTruthy();
    }
  });

  it("membutuhkan foto", () => {
    const result = validateReportSubmission({ ...validBase, hasFoto: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.foto).toBeTruthy();
    }
  });

  it("menolak tipe foto selain JPG/PNG/WebP", () => {
    const result = validateReportSubmission({ ...validBase, fotoType: "image/gif" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.foto).toBeTruthy();
    }
  });

  it("menolak foto lebih dari 5 MiB", () => {
    const result = validateReportSubmission({ ...validBase, fotoSize: 5 * 1024 * 1024 + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.foto).toBeTruthy();
    }
  });

  it("mengumpulkan beberapa galat sekaligus", () => {
    const result = validateReportSubmission({ facilityId: null, kategori: "", deskripsi: " ", hasFoto: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        facilityId: expect.any(String),
        kategori: expect.any(String),
        deskripsi: expect.any(String),
        foto: expect.any(String),
      });
    }
  });
});