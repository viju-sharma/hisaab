import { ImageResponse } from "next/og"

export const dynamic = "force-static"

const INDIGO = "#5b48c8"
const CREAM = "#fdfcfa"

/// Every icon size the manifest, the browser tab and iOS need, rendered from the
/// same geometry as components/brand/logo.tsx. Generating them means there is
/// one definition of the mark rather than a folder of PNGs that can drift.
const VARIANTS = {
  "icon-192": { size: 192, maskable: false },
  "icon-512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
  "apple-touch": { size: 180, maskable: false },
} as const

type Variant = keyof typeof VARIANTS

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }))
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ variant: string }> }
) {
  const { variant } = await context.params
  const config = VARIANTS[variant as Variant]
  if (!config) return new Response("Not found", { status: 404 })

  const { size, maskable } = config
  // A maskable icon may be cropped to a circle, so the mark shrinks into the
  // safe zone and the background bleeds to the edges.
  const scale = (maskable ? 0.78 : 1) * (size / 64)
  const offset = maskable ? (size * (1 - 0.78)) / 2 : 0
  const at = (value: number) => value * scale + offset

  const bar = (x: number, y: number, w: number, h: number, r: number) => (
    <div
      style={{
        position: "absolute",
        left: at(x),
        top: at(y),
        width: w * scale,
        height: h * scale,
        borderRadius: r * scale,
        background: CREAM,
      }}
    />
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          position: "relative",
          background: INDIGO,
        }}
      >
        {bar(9, 13, 46, 7, 3.5)}
        {bar(11.5, 20, 9, 31, 4.5)}
        {bar(27.5, 20, 9, 21, 4.5)}
        {bar(43.5, 20, 9, 27, 4.5)}
      </div>
    ),
    { width: size, height: size }
  )
}
