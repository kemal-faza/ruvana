import { describe, expect, it } from "vitest";

import { reservasiNavigation } from "@/app/reservasi/navigation";
import { navigation } from "@/config/navigation";
import { navigationForRole } from "@/config/navigation-for-role";
import { Role } from "@/generated/prisma/enums";

function semuaHref(): string[] {
  return reservasiNavigation.flatMap((grup) => grup.items.map((item) => item.href));
}

describe("navigasi reservasi pengguna", () => {
  it("tidak menautkan menu bagian petugas", () => {
    expect(semuaHref().filter((href) => href.startsWith("/petugas"))).toEqual([]);
  });

  it("tetap menautkan alur reservasi pengguna tanpa rute form terpisah di menu", () => {
    expect(semuaHref()).toEqual(
      expect.arrayContaining(["/reservasi/riwayat", "/fasilitas", "/reports"]),
    );
    expect(semuaHref()).not.toContain("/reservasi");
  });

  it("tidak menautkan ringkasan ke beranda", () => {
    expect(semuaHref()).not.toContain("/");
    expect(navigation.flatMap((grup) => grup.items.map((item) => item.href))).not.toContain("/");
  });

  it("menggabungkan Reservasi Saya dan Reservasi menjadi satu menu Reservasi", () => {
    const label = navigation.flatMap((grup) => grup.items.map((item) => item.label));

    expect(reservasiNavigation[0].items[0]).toMatchObject({
      label: "Reservasi",
      href: "/reservasi/riwayat",
    });
    expect(navigation[0].items[0]).toMatchObject({
      label: "Reservasi",
      href: "/reservasi/riwayat",
    });
    expect(label).not.toContain("Reservasi Saya");
    expect(label.filter((item) => item === "Reservasi")).toHaveLength(1);
    expect(semuaHref()).not.toContain("/baseline-ui");
    expect(navigation.flatMap((grup) => grup.items.map((item) => item.href))).not.toContain("/baseline-ui");
  });

  it("menyiapkan menu Reservasi aktif di form, daftar, dan detail", () => {
    expect(reservasiNavigation[0].items[0].activePrefixes).toEqual(
      expect.arrayContaining(["/reservasi"]),
    );
  });

  it("tidak menautkan menu reservasi pengguna untuk petugas maupun admin", () => {
    for (const role of [Role.petugas, Role.admin]) {
      const hrefs = navigationForRole(role).flatMap((grup) => grup.items.map((item) => item.href));
      expect(hrefs.filter((href) => href.startsWith("/reservasi"))).toEqual([]);
    }
  });
});
