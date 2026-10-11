import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { getPostLoginPath, resolvePostLoginPath, safeNextPath } from "@/lib/auth-routing";

describe("tujuan setelah login", () => {
  it("membuka dashboard sesuai peran", () => {
    expect(getPostLoginPath(Role.admin)).toBe("/admin/analitik");
    expect(getPostLoginPath(Role.petugas)).toBe("/petugas");
    expect(getPostLoginPath(Role.pengguna)).toBe("/reservasi/riwayat");
  });
});

describe("safeNextPath", () => {
  it("menerima path relatif beserta query string", () => {
    expect(safeNextPath("/reservasi?facilityId=8&date=2026-10-20&startTime=08%3A00")).toBe(
      "/reservasi?facilityId=8&date=2026-10-20&startTime=08%3A00",
    );
    expect(safeNextPath("/fasilitas/8")).toBe("/fasilitas/8");
  });

  it("menolak nilai yang bisa mengalihkan ke luar aplikasi", () => {
    expect(safeNextPath("https://situs-lain.example/masuk")).toBeNull();
    expect(safeNextPath("//situs-lain.example")).toBeNull();
    expect(safeNextPath("/\\situs-lain.example")).toBeNull();
    expect(safeNextPath("/reservasi\nLocation: https://situs-lain.example")).toBeNull();
  });

  it("menolak nilai kosong atau bukan string", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(["reservasi"])).toBeNull();
    expect(safeNextPath(42)).toBeNull();
  });
});

describe("resolvePostLoginPath", () => {
  it("memakai next untuk pengguna bila nilainya sah", () => {
    expect(resolvePostLoginPath(Role.pengguna, "/reservasi?facilityId=8")).toBe("/reservasi?facilityId=8");
  });

  it("kembali ke dasbor peran bila next tidak sah atau kosong", () => {
    expect(resolvePostLoginPath(Role.pengguna, "https://situs-lain.example")).toBe("/reservasi/riwayat");
    expect(resolvePostLoginPath(Role.pengguna)).toBe("/reservasi/riwayat");
  });

  it("tidak memakai next untuk petugas dan admin", () => {
    expect(resolvePostLoginPath(Role.petugas, "/reservasi?facilityId=8")).toBe("/petugas");
    expect(resolvePostLoginPath(Role.admin, "/reservasi?facilityId=8")).toBe("/admin/analitik");
  });
});
