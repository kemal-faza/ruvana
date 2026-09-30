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

  it("navigasi antrean admin tidak menambah menu lain", () => {
    expect(semuaHref(staffQueueNavigation)).toEqual(["/petugas/antrian"]);
  });
});
