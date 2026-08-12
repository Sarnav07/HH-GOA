/**
 * Hacker House Goa 2026 - the single source of truth for brand colour.
 * Values sampled by histogram off the official builder-pass artwork. Mirrored
 * in app/globals.css @theme; canvas cannot read CSS custom properties cheaply,
 * so the card renderer reads them from here.
 */
export const BRAND = {
  cream: "#f0e8d0",
  creamLift: "#f7f2e2",
  tan: "#e0d8b8",
  forest: "#004838",
  forestLift: "#065c47",
  forestDeep: "#001a12",
  gold: "#f8d028",
  goldDeep: "#d8a800",
  pink: "#f02878",
  pinkDeep: "#c81d5f",
} as const;

/**
 * Two accents is a deliberate override of the usual one-accent rule: the event
 * brand genuinely carries both. Roles are fixed and never swap.
 *   gold = the builder title and lockup highlight
 *   pink = actions, the hashtag, and framing
 * Gold is fill-only on light grounds. As text on cream it fails WCAG badly.
 */

export const DISPLAY_FONT = "Playfair Display";
export const SANS_FONT = "Cabinet Grotesk";
export const MONO_FONT = "JetBrains Mono";

export const EVENT_NAME = "HH GOA 2026";
export const EVENT_DATES = "28-31 OCT 2026";
export const EVENT_PLACE = "GOA, INDIA";
export const EVENT_TAGLINE = "CODE · CONNECT · CHILL · REPEAT";
export const EVENT_MISSION = "BUILD · SHIP · REPEAT";
export const EVENT_MOTTO = "LESS NOISE. MORE SIGNAL.";
export const HASHTAG = "#FrameInGoa";

/**
 * The prefilled post. Leads with the generated builder class, which is the part
 * people actually want to show off, and falls back cleanly when there is none.
 */
export function tweetCaption(title?: string) {
  const lines = ["Just got my Hacker House Goa 2026 builder pass."];
  if (title?.trim()) lines.push("", `Builder class: ${title.trim().toUpperCase()}`);
  lines.push("", `Goa, 28-31 Oct.`, HASHTAG);
  return lines.join("\n");
}
