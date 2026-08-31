/// A small, muted set that sits inside the ink-and-bone palette rather than
/// fighting it. Groups are identified by a monogram in one of these, which is
/// both more legible at small sizes than an emoji and stops the interface
/// looking like a sticker sheet.
export const GROUP_COLORS = {
  // Ink follows the theme: black on bone in light, bone on ink in dark.
  // A fixed near-black would vanish against a dark card.
  ink: { label: "Ink", bg: "var(--foreground)", fg: "var(--background)" },
  marigold: { label: "Marigold", bg: "oklch(0.775 0.153 70)", fg: "oklch(0.22 0.05 60)" },
  pine: { label: "Pine", bg: "oklch(0.435 0.088 160)", fg: "oklch(0.96 0.01 160)" },
  vermillion: { label: "Vermillion", bg: "oklch(0.485 0.158 33)", fg: "oklch(0.97 0.02 33)" },
  indigo: { label: "Indigo", bg: "oklch(0.38 0.09 265)", fg: "oklch(0.96 0.01 265)" },
  clay: { label: "Clay", bg: "oklch(0.6 0.075 55)", fg: "oklch(0.2 0.03 55)" },
  slate: { label: "Slate", bg: "oklch(0.48 0.028 240)", fg: "oklch(0.96 0.008 240)" },
  moss: { label: "Moss", bg: "oklch(0.58 0.075 125)", fg: "oklch(0.19 0.03 125)" },
} as const

export type GroupColorKey = keyof typeof GROUP_COLORS

export const GROUP_COLOR_KEYS = Object.keys(GROUP_COLORS) as GroupColorKey[]

export function groupColor(key: string) {
  return GROUP_COLORS[key as GroupColorKey] ?? GROUP_COLORS.ink
}

/// Falls back to a stable colour derived from the id, so a group created before
/// the picker existed still looks deliberate.
export function groupColorFor(key: string | null | undefined, seed: string) {
  if (key && key in GROUP_COLORS) return GROUP_COLORS[key as GroupColorKey]
  let hash = 0
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return GROUP_COLORS[GROUP_COLOR_KEYS[Math.abs(hash) % GROUP_COLOR_KEYS.length]!]
}

export function groupMonogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}
