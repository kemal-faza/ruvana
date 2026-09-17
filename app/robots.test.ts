import { describe, expect, it } from "vitest"

import robots from "@/app/robots"
import { SITE_URL } from "@/config/site"

describe("robots", () => {
  it("mengizinkan rute publik dan menunjuk sitemap", () => {
    const result = robots()

    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
    expect(result.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/baseline-ui"],
    })
  })
})
