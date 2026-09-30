import { describe, expect, it } from "vitest";

import { reservasiNavigation } from "@/app/reservasi/navigation";
import { navigation } from "@/config/navigation";

function semuaHref(): string[] {
  return reservasiNavigation.flatMap((grup) => grup.items.map((item) => item.href));
}

describe("navigasi reservasi pengguna", () => {
  it("tidak menautkan menu bagian petugas", () => {
    expect(semuaHref().filter((href) => href.startsWith("/petugas"))).toEqual([]);
  });

  it("tetap menautkan alur reservasi pengguna", () => {
    expect(semuaHref()).toEqual(
      expect.arrayContaining(["/reservasi", "/reservasi/riwayat"]),
    );
  });

  it("tidak menautkan ringkasan ke beranda", () => {
    expect(semuaHref()).not.toContain("/");
    expect(navigation.flatMap((grup) => grup.items.map((item) => item.href))).not.toContain("/");
  });
});
