import { describe, expect, it } from "vitest";

import {
  parseAdminListQuery,
  parseFacilityCreateBody,
  parseFacilityUpdateBody,
} from "./admin-facility";

describe("parseAdminListQuery", () => {
  it("memakai default page dan perPage", () => {
    const result = parseAdminListQuery(new URLSearchParams());
    expect(result).toEqual({ ok: true, value: { page: 1, perPage: 20 } });
  });

  it("mem-parse search, type, location, dan status", () => {
    const result = parseAdminListQuery(
      new URLSearchParams({ search: "lab", type: "laboratorium", location: "Gedung A", status: "INACTIVE" }),
    );
    expect(result).toEqual({
      ok: true,
      value: { page: 1, perPage: 20, search: "lab", type: "laboratorium", location: "Gedung A", status: "INACTIVE" },
    });
  });

  it("menolak status di luar enum", () => {
    const result = parseAdminListQuery(new URLSearchParams({ status: "RUSAK" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "status", code: "INVALID_ENUM" });
  });

  it("menolak page tidak valid", () => {
    const result = parseAdminListQuery(new URLSearchParams({ page: "0" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "page", code: "OUT_OF_RANGE" });
  });

  it("menolak page di luar jangkauan int4", () => {
    const result = parseAdminListQuery(new URLSearchParams({ page: "99999999999999999999" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "page", code: "INVALID_INTEGER" });
  });

  it("menolak perPage di luar jangkauan int4", () => {
    const result = parseAdminListQuery(new URLSearchParams({ perPage: "99999999999999999999" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "perPage", code: "INVALID_INTEGER" });
  });
});

describe("parseFacilityCreateBody", () => {
  it("menerima body lengkap", () => {
    const result = parseFacilityCreateBody({
      nama: "Studio Musik",
      tipe: "aula",
      lokasi: "Gedung C Lt.1",
      kapasitas: 80,
      deskripsi: "Ruang latihan musik.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ nama: "Studio Musik", tipe: "aula", kapasitas: 80 });
  });

  it("menerima deskripsi null dan field opsional yang hilang", () => {
    const result = parseFacilityCreateBody({ nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 1, deskripsi: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.deskripsi).toBeNull();
  });

  it("menolak field wajib yang hilang", () => {
    const result = parseFacilityCreateBody({ nama: "Aula" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toEqual(expect.arrayContaining(["tipe", "lokasi", "kapasitas"]));
    }
  });

  it("menolak field asing", () => {
    const result = parseFacilityCreateBody({
      nama: "Aula",
      tipe: "aula",
      lokasi: "Gedung",
      kapasitas: 1,
      status: "ACTIVE",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ field: "status", code: "UNKNOWN_FIELD" }));
  });

  it("menolak kapasitas nol dan tipe salah", () => {
    const result = parseFacilityCreateBody({ nama: "Aula", tipe: "gedung", lokasi: "Gedung", kapasitas: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code);
      expect(codes).toEqual(expect.arrayContaining(["OUT_OF_RANGE", "INVALID_ENUM"]));
    }
  });

  it("menolak nama lebih dari 100 karakter", () => {
    const result = parseFacilityCreateBody({
      nama: "a".repeat(101),
      tipe: "aula",
      lokasi: "Gedung",
      kapasitas: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "nama", code: "TOO_LONG" });
  });
});

describe("parseFacilityUpdateBody", () => {
  it("menolak body kosong dengan MIN_PROPERTIES", () => {
    const result = parseFacilityUpdateBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "body", code: "MIN_PROPERTIES" });
  });

  it("menerima satu field saja", () => {
    const result = parseFacilityUpdateBody({ deskripsi: "Baru" });
    expect(result).toEqual({ ok: true, value: { deskripsi: "Baru" } });
  });

  it("memperbolehkan deskripsi null", () => {
    const result = parseFacilityUpdateBody({ deskripsi: null });
    expect(result).toEqual({ ok: true, value: { deskripsi: null } });
  });

  it("menerima perubahan status", () => {
    const result = parseFacilityUpdateBody({ status: "UNDER_MAINTENANCE" });
    expect(result).toEqual({ ok: true, value: { status: "UNDER_MAINTENANCE" } });
  });

  it("menolak status INACTIVE pada validasi, tapi bukan enum error", () => {
    const result = parseFacilityUpdateBody({ status: "INACTIVE" });
    expect(result).toEqual({ ok: true, value: { status: "INACTIVE" } });
  });

  it("menolak field asing", () => {
    const result = parseFacilityUpdateBody({ kapasitas: 5, foo: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ field: "foo", code: "UNKNOWN_FIELD" }));
  });

  it("menolak kapasitas non-integer", () => {
    const result = parseFacilityUpdateBody({ kapasitas: "banyak" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "kapasitas", code: "INVALID_INTEGER" });
  });

  it("menolak kapasitas di atas batas int4", () => {
    const result = parseFacilityUpdateBody({ kapasitas: 2_147_483_648 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ field: "kapasitas", code: "OUT_OF_RANGE" });
  });

  it("menerima kapasitas tepat di batas int4", () => {
    const result = parseFacilityUpdateBody({ kapasitas: 2_147_483_647 });
    expect(result.ok).toBe(true);
  });
});

describe("metadata foto fasilitas", () => {
  const dasar = { nama: "Aula", tipe: "aula", lokasi: "Gedung", kapasitas: 10 };

  it("menerima fotoPathname, fotoType, dan fotoSize yang valid", () => {
    const result = parseFacilityCreateBody({
      ...dasar,
      fotoPathname: "facilities/7/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
      fotoType: "image/jpeg",
      fotoSize: 1234,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fotoPathname).toBe("facilities/7/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg");
      expect(result.value.fotoType).toBe("image/jpeg");
      expect(result.value.fotoSize).toBe(1234);
    }
  });

  it("menolak tipe foto yang tidak didukung", () => {
    const result = parseFacilityCreateBody({
      ...dasar,
      fotoPathname: "facilities/7/x.jpg",
      fotoType: "image/gif",
      fotoSize: 10,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ field: "fotoType" }));
  });

  it("menolak ukuran foto melebihi batas", () => {
    const result = parseFacilityCreateBody({
      ...dasar,
      fotoPathname: "facilities/7/x.jpg",
      fotoType: "image/jpeg",
      fotoSize: 6 * 1024 * 1024,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ field: "fotoSize" }));
  });

  it("mengizinkan update menghapus foto lewat null", () => {
    const result = parseFacilityUpdateBody({ fotoPathname: null });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.fotoPathname).toBeNull();
  });

  it("menolak field foto yang tidak dikenal", () => {
    const result = parseFacilityUpdateBody({ foto: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ field: "foto" }));
  });
});

