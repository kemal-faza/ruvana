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
      expect.arrayContaining(["/reservasi/riwayat", "/reservasi", "/fasilitas", "/reports"]),
    );
  });

  it("tidak menautkan ringkasan ke beranda", () => {
    expect(semuaHref()).not.toContain("/");
    expect(navigation.flatMap((grup) => grup.items.map((item) => item.href))).not.toContain("/");
  });

  it("menempatkan Reservasi Saya di urutan pertama dan tidak menautkan Baseline UI", () => {
    expect(reservasiNavigation[0].items[0]).toMatchObject({
      label: "Reservasi Saya",
      href: "/reservasi/riwayat",
    });
    expect(navigation[0].items[0]).toMatchObject({
      label: "Reservasi Saya",
      href: "/reservasi/riwayat",
    });
    expect(semuaHref()).not.toContain("/baseline-ui");
    expect(navigation.flatMap((grup) => grup.items.map((item) => item.href))).not.toContain("/baseline-ui");
  });
});
