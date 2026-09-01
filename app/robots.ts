import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site-url"

/// Everything behind the auth gate is disallowed explicitly. A crawler cannot
/// reach it anyway — the proxy redirects it to sign-in — but saying so stops
/// crawlers spending their budget on redirects.
///
/// Invite links are deliberately *not* listed. They are the one private thing a
/// crawler can actually render, and a disallowed URL can still be indexed by
/// address alone — the crawler never reads the page that would have told it
/// not to. Letting it fetch `/join/<code>` is what makes the `noindex` on that
/// page bind.
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
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
