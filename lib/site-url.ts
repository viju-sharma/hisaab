/// The canonical origin, for anything that has to write an absolute URL:
/// robots, the sitemap, and metadata. Vercel sets
/// `VERCEL_PROJECT_PRODUCTION_URL` to the project's production domain on every
/// deployment, so previews advertise the production origin rather than their
/// own throwaway hostname — which is what you want in a sitemap.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://hisaab.site"
