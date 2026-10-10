import { describe, expect, it } from "vitest";

import { ringkasAkun } from "./ringkasan-akun";

describe("ringkasAkun", () => {
  it("menghitung total dari semua status dan memecahnya per status kartu", () => {
    const ringkasan = ringkasAkun([
      { status: "ACTIVE" },
      { status: "ACTIVE" },
      { status: "PENDING" },
      { status: "DISABLED" },
      { status: "REJECTED" },
    ]);

    expect(ringkasan).toEqual({ total: 5, aktif: 2, pending: 1, dinonaktifkan: 1 });
  });

  it("mengembalikan hitungan nol untuk daftar kosong", () => {
    expect(ringkasAkun([])).toEqual({ total: 0, aktif: 0, pending: 0, dinonaktifkan: 0 });
  });
});
