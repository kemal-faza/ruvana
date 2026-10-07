import { describe, expect, it } from "vitest"

import nextConfig from "./next.config"

describe("redirect rute fasilitas lama", () => {
  it("mengarahkan katalog dan detail publik ke rute tunggal", async () => {
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toContainEqual({
      source: "/publik/fasilitas",
      destination: "/fasilitas",
      permanent: true,
    })
    expect(redirects).toContainEqual({
      source: "/publik/fasilitas/:facilityId",
      destination: "/fasilitas/:facilityId",
      permanent: true,
    })
  })
})
