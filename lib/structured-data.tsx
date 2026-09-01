import { siteUrl } from "@/lib/site-url"

/// What the landing page tells a search engine about itself, beyond the words
/// on it. Three linked nodes in one graph rather than three loose scripts: the
/// organisation, the site, and the thing the site is — so a crawler resolves
/// "Hisaab" to one entity instead of guessing it is three.
const organisationId = `${siteUrl}/#organization`
const websiteId = `${siteUrl}/#website`

const DESCRIPTION =
  "Split bills with friends, flatmates and family. Track who paid, who owes, and settle up — in rupees."

export function landingStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organisationId,
        name: "Hisaab",
        url: siteUrl,
        description: DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icons/icon-512`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Hisaab",
        alternateName: "हिसाब",
        url: siteUrl,
        description: DESCRIPTION,
        inLanguage: "en-IN",
        publisher: { "@id": organisationId },
      },
      {
        "@type": "WebApplication",
        name: "Hisaab",
        url: siteUrl,
        description: DESCRIPTION,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript.",
        inLanguage: "en-IN",
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organisationId },
        // Free, and saying so is what earns the price row in a result.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          "Split evenly, by exact amounts, by percentage or by shares",
          "More than one payer on a single expense",
          "Indian rupee formatting in lakhs and crores",
          "Multi-currency expenses at the rate on the day",
          "Settle up in the fewest possible payments",
          "A full audit trail of every edit",
          "Recurring expenses",
          "Installable as a progressive web app",
        ],
      },
    ],
  }
}

/// JSON-LD has to reach the crawler in the HTML, so it is a plain script tag
/// rendered on the server. The payload is ours, not user input, and it is
/// serialised with `<` escaped so it can never close the script early.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
