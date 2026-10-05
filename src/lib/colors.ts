// Avatar / card swatches drawn from the Wise-style palette. Text color picked for contrast.
export const SWATCHES = {
  forest: { bg: "#163300", fg: "#9fe870", label: "Leśny" },
  lime: { bg: "#9fe870", fg: "#163300", label: "Limonka" },
  spruce: { bg: "#054d28", fg: "#ffffff", label: "Świerk" },
  mist: { bg: "#e2f6d5", fg: "#163300", label: "Mięta" },
  blue: { bg: "#0b4c72", fg: "#ffffff", label: "Granat" },
  red: { bg: "#cb272f", fg: "#ffffff", label: "Czerwony" },
  obsidian: { bg: "#0e0f0c", fg: "#ffffff", label: "Czarny" },
  fog: { bg: "#e8ebe6", fg: "#0e0f0c", label: "Mgła" },
} as const;

export type Swatch = keyof typeof SWATCHES;

export function swatch(name: string | null | undefined) {
  return SWATCHES[(name as Swatch) in SWATCHES ? (name as Swatch) : "forest"];
}
