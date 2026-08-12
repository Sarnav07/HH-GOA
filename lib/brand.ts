/**
 * Azulejo Dusk - the single source of truth for brand colour.
 * These values are mirrored in app/globals.css @theme. Canvas cannot read CSS
 * custom properties cheaply, so the card renderer reads them from here.
 */
export const BRAND = {
  inkDeep: "#091628",
  ink: "#0e1f3c",
  indigo: "#16305c",
  indigoLift: "#1d3d70",
  tile: "#2f5d9e",
  cream: "#f4ede1",
  sand: "#d9c7a7",
  terracotta: "#c75b39",
  terracottaLift: "#d96f4d",
} as const;

export const DISPLAY_FONT = "Cabinet Grotesk";
export const MONO_FONT = "JetBrains Mono";

export const EVENT_NAME = "HH GOA 2026";
export const HASHTAG = "#FrameInGoa";
export const TWEET_CAPTION = `I'm building at HH Goa 2026. ${HASHTAG}`;
