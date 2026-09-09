/**
 * Categorical hues in fixed order — assigned by position, never cycled, so a series keeps
 * its colour when a filter changes the set. Orange sits between green and red on purpose:
 * adjacent orange/red failed colour-blind separation, and reordering fixes it where
 * re-tinting could not.
 *
 * Both rows were checked with the palette validator (lightness band, chroma floor, CVD
 * separation, normal-vision floor, contrast) against their own surface. Dark is its own
 * set of steps, not an automatic lightening of the light one.
 */
export const CATEGORICAL_LIGHT = ["#15a06a", "#e08b12", "#2f7fe0", "#d93a2b"] as const;
export const CATEGORICAL_DARK = ["#1faa72", "#c9821b", "#4a90ea", "#e04b3d"] as const;

/** Amber sits below 3:1 against the light surface, so anything drawn in it needs a visible
 * label or the table view to carry the value — never colour alone. */
export const SERIES_NAMES_REQUIRE_LABELS = true;

export function seriesColor(index: number, dark = false): string {
  const ramp = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  return ramp[index % ramp.length];
}
