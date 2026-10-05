// Avatar / card swatches: a neutral gray ramp (keys kept for stored values). Light ones get a hairline.
export const SWATCHES = {
  forest: { bg: "#0a0a0a", fg: "#ffffff", label: "Czarny", ring: false },
  obsidian: { bg: "#262626", fg: "#ffffff", label: "Grafit", ring: false },
  spruce: { bg: "#404040", fg: "#ffffff", label: "Ciemnoszary", ring: false },
  red: { bg: "#737373", fg: "#ffffff", label: "Szary", ring: false },
  blue: { bg: "#a3a3a3", fg: "#ffffff", label: "Popiel", ring: false },
  lime: { bg: "#e5e5e5", fg: "#0a0a0a", label: "Jasnoszary", ring: false },
  mist: { bg: "#f5f5f5", fg: "#0a0a0a", label: "Mgła", ring: true },
  fog: { bg: "#ffffff", fg: "#0a0a0a", label: "Biały", ring: true },
} as const;

export type Swatch = keyof typeof SWATCHES;

export function swatch(name: string | null | undefined) {
  return SWATCHES[(name as Swatch) in SWATCHES ? (name as Swatch) : "forest"];
}
