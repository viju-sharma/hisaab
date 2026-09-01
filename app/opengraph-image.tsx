import { ImageResponse } from "next/og"

import { siteUrl } from "@/lib/site-url"

export const dynamic = "force-static"

export const alt =
  "Hisaab — who paid, who owes, and what it takes to be square."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/// The card every share, every preview and every crawler sees. Drawn from the
/// same tokens as the landing page — the light palette resolved out of
/// `globals.css` — so the preview and the page it opens are the same object.
/// Static, because nothing on it depends on the request.
const BACKGROUND = "#f3f0e9"
const FOREGROUND = "#171310"
const MUTED = "#5c554f"
const BORDER = "#d1cbc3"
const BRAND = "#f3a230"

/// The bare host, so the card names wherever it is actually deployed.
const host = new URL(siteUrl).host

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BACKGROUND,
        color: FOREGROUND,
        padding: "72px 80px",
      }}
    >
      {/* The mark, in the same dark tile the header wears. */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 64,
            height: 64,
            borderRadius: 10,
            background: FOREGROUND,
          }}
        >
          {/* The two unequal bars of components/brand/logo.tsx, scaled from
                its 64-unit viewBox onto a 44px mark inside the tile. */}
          <div
            style={{
              position: "absolute",
              left: 19.6,
              top: 24.4,
              width: 24.8,
              height: 6.2,
              borderRadius: 3.1,
              background: BACKGROUND,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 19.6,
              top: 33.3,
              width: 15.1,
              height: 6.2,
              borderRadius: 3.1,
              background: BACKGROUND,
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600 }}>
          Hisaab
        </div>
        <div
          style={{
            display: "flex",
            marginLeft: 6,
            fontSize: 22,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          shared expenses, settled
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 82,
            lineHeight: 1.02,
            fontWeight: 500,
            letterSpacing: "-0.03em",
          }}
        >
          <div style={{ display: "flex" }}>Who paid, who owes,</div>
          <div style={{ display: "flex" }}>and what it takes</div>
          {/* The rule under the last line is the one flourish the hero has. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>to be square.</div>
            <div
              style={{
                display: "flex",
                width: 462,
                height: 6,
                marginTop: 10,
                background: BRAND,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `2px solid ${BORDER}`,
          paddingTop: 28,
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>
          Split bills with friends, flatmates and family — in rupees.
        </div>
        <div style={{ display: "flex" }}>{host}</div>
      </div>
    </div>,
    size
  )
}
