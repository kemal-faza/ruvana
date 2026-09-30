import { describe, expect, it } from "vitest";

import { reservasiNavigation } from "@/app/reservasi/navigation";

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
});
