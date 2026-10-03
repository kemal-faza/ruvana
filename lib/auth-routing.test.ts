import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { getPostLoginPath, getReservationReturnPath } from "@/lib/auth-routing";

describe("tujuan setelah login", () => {
  it("membuka dashboard sesuai peran", () => {
    expect(getPostLoginPath(Role.admin)).toBe("/admin/analitik");
    expect(getPostLoginPath(Role.petugas)).toBe("/petugas");
    expect(getPostLoginPath(Role.pengguna)).toBe("/reservasi");
  });

  it("mempertahankan konteks tipe dan tanggal pencarian reservasi", () => {
    expect(
      getReservationReturnPath({ type: "aula", date: "2026-10-04", ignored: "value" }),
    ).toBe("/reservasi?type=aula&date=2026-10-04");
    expect(getReservationReturnPath({ type: ["aula", "lapangan"], date: "" })).toBe("/reservasi");
  });

  it("mengembalikan pengguna ke rute yang aman setelah login", () => {
    expect(getPostLoginPath(Role.pengguna, "/reservasi?type=aula&date=2026-10-04")).toBe(
      "/reservasi?type=aula&date=2026-10-04",
    );
    expect(getPostLoginPath(Role.pengguna, "/reports")).toBe("/reports");
  });

  it("menolak tujuan eksternal dan tujuan yang tidak dapat diakses oleh peran", () => {
    expect(getPostLoginPath(Role.pengguna, "https://evil.example")).toBe("/reservasi");
    expect(getPostLoginPath(Role.pengguna, "//evil.example/path")).toBe("/reservasi");
    expect(getPostLoginPath(Role.petugas, "/reservasi?type=aula")).toBe("/petugas");
    expect(getPostLoginPath(Role.admin, "/reports")).toBe("/admin/analitik");
  });
});
