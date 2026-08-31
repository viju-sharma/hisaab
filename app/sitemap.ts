import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site-url"

/// Only the pages a stranger can actually open. The app itself is private, and
/// a group or invite URL in a sitemap would be a leak rather than an entry.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/sign-in`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/sign-up`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ]
}
