/// X reads `twitter:image` and only falls back to `og:image` by convention, so
/// the same card is published under both names rather than left to the crawler.
/// `dynamic` is declared here rather than re-exported: Next parses it out of
/// the route file statically, and cannot follow it through a re-export.
export const dynamic = "force-static"

export { default, alt, size, contentType } from "./opengraph-image"
