"use client"

/// The last boundary: this replaces the root layout, so it cannot use anything
/// from it — no fonts, no theme provider, no design tokens. Inline styles only,
/// and it must render its own `html` and `body`.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#faf8f5",
          color: "#1a1a1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.75rem", lineHeight: 1.15, margin: 0 }}>
            Hisaab could not start.
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.7 }}>
            Something failed before the app loaded. Reloading usually clears it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#1a1a1a",
              color: "#faf8f5",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.75rem",
                opacity: 0.5,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
