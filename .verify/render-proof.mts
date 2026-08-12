/**
 * Headless proof render.
 *
 * Runs lib/render.ts against a Skia canvas so the card can be inspected as a
 * real PNG without a browser. Development aid only, not part of the app.
 *
 *   npx tsx .verify/render-proof.ts
 */
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;

GlobalFonts.registerFromPath(
  join(here, "fonts/CabinetGrotesk-Extrabold.ttf"),
  "Cabinet Grotesk",
);
GlobalFonts.registerFromPath(
  join(here, "fonts/CabinetGrotesk-Bold.ttf"),
  "Cabinet Grotesk",
);
GlobalFonts.registerFromPath(
  join(here, "fonts/JetBrainsMono.ttf"),
  "JetBrains Mono",
);
GlobalFonts.registerFromPath(
  join(here, "fonts/PlayfairDisplay-Black.ttf"),
  "Playfair Display",
);

// lib/azulejo.ts builds its tile with document.createElement("canvas").
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== "canvas") throw new Error(`Unexpected element: ${tag}`);
    return createCanvas(1, 1);
  },
};

const coastMod = await import("../lib/coast");
const coastPng = await loadImage(join(here, "../public/goa-coast.webp"));
(coastMod as unknown as { __setCoast?: (i: unknown) => void }).__setCoast?.(
  coastPng,
);

const { drawCard, SIZES, emptyState } = await import("../lib/render");
const { builderSerial, builderTitle } = await import("../lib/title");

type AnyCtx = Parameters<typeof drawCard>[0];

async function shoot(
  file: string,
  variant: "card" | "og",
  state: Awaited<ReturnType<typeof scene>>,
) {
  const { w, h } = SIZES[variant];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  drawCard(ctx as unknown as AnyCtx, state, variant);
  writeFileSync(join(here, file), canvas.toBuffer("image/png"));
  console.log(`wrote ${file}  ${w}x${h}`);
}

async function scene(
  name: string,
  stack: string,
  photoPath: string | null,
  zoom = 1,
) {
  const state = emptyState();
  state.name = name;
  state.stack = stack;
  state.title = name ? builderTitle(name, stack) : "";
  state.serial = builderSerial(name, stack);
  state.zoom = zoom;
  if (photoPath) {
    // drawImage accepts any Skia image; the app's runtime type is ImageBitmap.
    state.photo = (await loadImage(photoPath)) as unknown as ImageBitmap;
  }
  return state;
}

const portrait = join(here, "sample-portrait.jpg");
const landscape = join(here, "sample-landscape.jpg");

await shoot("out-empty.png", "card", await scene("", "", null));
await shoot(
  "out-portrait.png",
  "card",
  await scene("Rhea Fernandes", "full-stack", portrait),
);
await shoot(
  "out-landscape.png",
  "card",
  await scene("Aditya Nair", "infra, distributed systems", landscape),
);
await shoot(
  "out-longname.png",
  "card",
  await scene(
    "Bartholomew Vasconcellos-Braganza",
    "machine learning research",
    portrait,
  ),
);
await shoot(
  "out-og.png",
  "og",
  await scene("Rhea Fernandes", "full-stack", portrait),
);
