import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hisaab — shared expenses, settled",
    short_name: "Hisaab",
    description:
      "Split bills with friends, flatmates and family. Track who paid, who owes, and settle up — in rupees.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfcfa",
    theme_color: "#5b48c8",
    lang: "en-IN",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Add an expense", url: "/groups?add=1" },
      { name: "Balances", url: "/dashboard" },
    ],
  }
}
