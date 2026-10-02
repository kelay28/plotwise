import type { BedSection } from "./garden";

/** Kinds of blocked-off bed areas. Color tints the striped overlay on the grid and map. */
export const SECTION_KINDS = {
  compost: { name: "Compost", emoji: "🪱", color: "#8d6e4f" },
  amending: { name: "Being amended", emoji: "🧪", color: "#c08a3e" },
  path: { name: "Path", emoji: "👣", color: "#8a8f98" },
  resting: { name: "Resting / cover crop", emoji: "💤", color: "#6f9e4f" },
  other: { name: "Blocked off", emoji: "🚧", color: "#6b7a8f" },
} as const;
export type SectionKind = keyof typeof SECTION_KINDS;

export const sectionKind = (k: string) => SECTION_KINDS[(k in SECTION_KINDS ? k : "other") as SectionKind];
export const sectionName = (s: Pick<BedSection, "kind" | "label">) => s.label?.trim() || sectionKind(s.kind).name;

/** Diagonal stripes in the section's color, readable in light and dark themes. */
export const sectionFill = (k: string) => {
  const c = sectionKind(k).color;
  return `repeating-linear-gradient(135deg, color-mix(in oklab, ${c} 30%, transparent) 0 6px, color-mix(in oklab, ${c} 14%, transparent) 6px 12px)`;
};
