import { describe, expect, it } from "vitest"

import sitemap from "@/app/sitemap"
import { SITE_URL } from "@/config/site"

describe("sitemap", () => {
  it("memuat rute statis publik", () => {
    const entries = sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([SITE_URL, `${SITE_URL}/fasilitas`])
  })
})
