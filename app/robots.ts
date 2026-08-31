import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site-url"

/// Everything behind the auth gate is disallowed explicitly. A crawler cannot
/// reach it anyway — the proxy redirects it to sign-in — but saying so stops
/// crawlers spending their budget on redirects, and keeps invite links, which
/// are unguessable but public, out of any index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/groups",
        "/activity",
        "/notifications",
        "/settings",
        "/join/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
