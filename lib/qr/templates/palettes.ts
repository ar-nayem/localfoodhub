import type { TemplatePalette } from "./types";

/** Shared colour sets. Templates pick one rather than inventing their own, which keeps
 * 30+ designs looking like one family instead of thirty unrelated cards. */
export const PALETTES = {
  cream: {
    paper: "#FBF6EC",
    surface: "#FFFFFF",
    ink: "#1B2A22",
    muted: "#6B7A72",
    accent: "#20693F",
    accentSoft: "#E4EFE6",
    line: "#E4DCCB",
  },
  forest: {
    paper: "#14361F",
    surface: "#FFFFFF",
    ink: "#FFFFFF",
    muted: "#B7CDBF",
    accent: "#8CD39B",
    accentSoft: "#1E5231",
    line: "#2A6440",
  },
  linen: {
    paper: "#F5F1E8",
    surface: "#FFFFFF",
    ink: "#2A2118",
    muted: "#7A6C5D",
    accent: "#C4762B",
    accentSoft: "#F7E7D2",
    line: "#E6DCC9",
  },
  mint: {
    paper: "#EDF7F0",
    surface: "#FFFFFF",
    ink: "#153026",
    muted: "#5E7A6C",
    accent: "#20693F",
    accentSoft: "#D6EBDC",
    line: "#D3E6D8",
  },
  charcoal: {
    paper: "#1C1F1D",
    surface: "#FFFFFF",
    ink: "#FFFFFF",
    muted: "#A8B0AA",
    accent: "#9BD9A8",
    accentSoft: "#2A302C",
    line: "#343A36",
  },
  blush: {
    paper: "#FDF1EE",
    surface: "#FFFFFF",
    ink: "#3A2320",
    muted: "#8A6B65",
    accent: "#C2543C",
    accentSoft: "#FADFD7",
    line: "#F0DAD3",
  },
  sky: {
    paper: "#EEF4FB",
    surface: "#FFFFFF",
    ink: "#16283C",
    muted: "#5F7590",
    accent: "#2F6FB5",
    accentSoft: "#D9E7F7",
    line: "#D5E2F0",
  },
  amber: {
    paper: "#FFF7E8",
    surface: "#FFFFFF",
    ink: "#33260F",
    muted: "#8A7550",
    accent: "#D08B12",
    accentSoft: "#FBEBCB",
    line: "#F0E2C6",
  },
} satisfies Record<string, TemplatePalette>;

export type PaletteName = keyof typeof PALETTES;
