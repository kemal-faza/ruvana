import type { MetadataRoute } from "next"

import { SITE_URL } from "@/config/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/fasilitas`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ]
}
