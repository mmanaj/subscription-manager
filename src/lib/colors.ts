// Avatar / card swatches: a neutral gray ramp (keys kept for stored values). Light ones get a hairline.
export const SWATCHES = {
  forest: { bg: "#0a0a0a", fg: "#ffffff", ring: false },
  obsidian: { bg: "#262626", fg: "#ffffff", ring: false },
  spruce: { bg: "#404040", fg: "#ffffff", ring: false },
  red: { bg: "#737373", fg: "#ffffff", ring: false },
  blue: { bg: "#a3a3a3", fg: "#ffffff", ring: false },
  lime: { bg: "#e5e5e5", fg: "#0a0a0a", ring: false },
  mist: { bg: "#f5f5f5", fg: "#0a0a0a", ring: true },
  fog: { bg: "#ffffff", fg: "#0a0a0a", ring: true },
} as const;

export type Swatch = keyof typeof SWATCHES;

export function swatch(name: string | null | undefined) {
  return SWATCHES[(name as Swatch) in SWATCHES ? (name as Swatch) : "forest"];
}
