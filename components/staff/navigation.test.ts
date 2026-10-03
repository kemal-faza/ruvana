import { describe, expect, it } from "vitest";

import { staffNavigation, staffQueueNavigation } from "@/components/staff/navigation";

function semuaHref(navigasi: readonly { items: readonly { href: string }[] }[]): string[] {
  return navigasi.flatMap((grup) => grup.items.map((item) => item.href));
}

describe("navigasi petugas", () => {
  it("tidak menautkan menu reservasi milik pengguna", () => {
    expect(semuaHref(staffNavigation).filter((href) => href.startsWith("/reservasi"))).toEqual([]);
  });

  it("menautkan menu Persetujuan Reservasi resmi", () => {
    expect(semuaHref(staffNavigation)).toContain("/petugas/antrian");
  });

  it("menautkan halaman laporan kerusakan untuk petugas", () => {
    expect(semuaHref(staffNavigation)).toContain("/petugas/laporan");
  });

  it("tidak menautkan katalog baseline dari navigasi petugas", () => {
    expect(semuaHref(staffNavigation)).not.toContain("/baseline-ui");
  });

  it("navigasi antrean admin memuat antrean reservasi dan laporan", () => {
    expect(semuaHref(staffQueueNavigation)).toEqual(["/petugas/antrian", "/petugas/laporan"]);
  });
});
