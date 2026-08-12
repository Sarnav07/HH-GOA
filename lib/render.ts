/**
 * The card renderer.
 *
 * One pure-ish function of (state, variant) draws the whole graphic, so the
 * live preview, the downloaded PNG, and the OG link-preview image can never
 * drift apart. Everything is hand-composed on a 2D context: no html2canvas
 * (mis-renders modern CSS, slow) and no server round trip (the brief asks for
 * near-instant, and a network hop is not that).
 */
import { BRAND, DISPLAY_FONT, EVENT_NAME, HASHTAG, MONO_FONT } from "./brand";
import { azulejoPattern } from "./azulejo";

export type CardState = {
  name: string;
  stack: string;
  title: string;
  photo: ImageBitmap | null;
  /** Photo pan, in units of the photo window size. 0 is centred. */
  offsetX: number;
  offsetY: number;
  /** Photo zoom multiplier on top of the cover fit. 1 is a plain cover fit. */
  zoom: number;
};

export type Variant = "card" | "og";

export const SIZES = {
  /** 4:5. The graphic people download and post. */
  card: { w: 1080, h: 1350 },
  /** 1.91:1. Purpose-built so X does not centre-crop the name off the card. */
  og: { w: 1200, h: 630 },
} as const;

/**
 * The photo window in card pixels. Exported because the drag handler has to
 * translate screen movement into the same units drawPhoto pans in, and the two
 * silently disagreeing would make dragging feel wrong on one axis.
 */
export const PHOTO_WINDOW = { w: 1080 - 64 * 2, h: 700 } as const;

export const emptyState = (): CardState => ({
  name: "",
  stack: "",
  title: "",
  photo: null,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
});

/* ------------------------------------------------------------------ helpers */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Shrinks the font until the text fits, then truncates as a last resort.
 * A long name must never overflow the card or wrap into the fields below it.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight: number,
  family: string,
) {
  let size = startSize;
  const setFont = (s: number) => {
    ctx.font = `${weight} ${s}px "${family}"`;
  };

  setFont(size);
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    setFont(size);
  }

  let out = text;
  if (ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(`${out}...`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    out = `${out.trimEnd()}...`;
  }
  return { text: out, size };
}

/** Letter-spaced draw. Canvas letterSpacing is uneven across browsers. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  align: "left" | "right" = "left",
) {
  const chars = [...text];
  const width =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) +
    tracking * Math.max(0, chars.length - 1);

  let cursor = align === "right" ? x - width : x;
  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + tracking;
  }
  return width;
}

/**
 * Cover-fits the photo into the window, then applies the user's pan and zoom.
 * Portrait, landscape, square, and off-centre crops all land somewhere sane
 * without the user being asked to crop first.
 */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  photo: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
  state: CardState,
) {
  const scale = Math.max(w / photo.width, h / photo.height) * state.zoom;
  const dw = photo.width * scale;
  const dh = photo.height * scale;

  // Pan is clamped so the photo can never be dragged clear of its window.
  const slackX = Math.max(0, (dw - w) / 2);
  const slackY = Math.max(0, (dh - h) / 2);
  const panX = Math.max(-slackX, Math.min(slackX, state.offsetX * w));
  const panY = Math.max(-slackY, Math.min(slackY, state.offsetY * h));

  ctx.drawImage(
    photo,
    x + (w - dw) / 2 + panX,
    y + (h - dh) / 2 + panY,
    dw,
    dh,
  );
}

/** Perforation dots, the detail that reads the card as a physical badge. */
function drawPerforation(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  step: number,
  r: number,
) {
  ctx.fillStyle = BRAND.tile;
  for (let x = x1; x <= x2; x += step) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Fine grain. Kept subtle and drawn once per render, never animated. */
function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const dots = Math.floor((w * h) / 900);

  // xorshift32. A plain LCG here multiplied past 2^53, lost precision, and
  // collapsed the noise into visible banding.
  let s = 0x9e3779b9;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = BRAND.cream;
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(x + rand() * w, y + rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/* --------------------------------------------------------------- the badge */

/**
 * Draws the badge itself at an arbitrary origin and size. Both variants share
 * this, which is why the OG image is the real card and not a re-layout.
 */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  state: CardState,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const u = w / 1080; // Everything below is expressed in card units.
  const pad = 64 * u;
  // Laid out in card units, then scaled, so both variants share one geometry.

  ctx.save();
  roundRect(ctx, x, y, w, h, 40 * u);
  ctx.clip();

  // Ground.
  const ground = ctx.createLinearGradient(x, y, x, y + h);
  ground.addColorStop(0, BRAND.indigo);
  ground.addColorStop(1, BRAND.ink);
  ctx.fillStyle = ground;
  ctx.fillRect(x, y, w, h);

  // Azulejo band across the head of the card.
  const bandH = 232 * u;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, bandH);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  ctx.translate(x, y);
  ctx.fillStyle = azulejoPattern(ctx, Math.round(232 * u), {
    bg: BRAND.indigo,
    line: BRAND.tile,
    accent: BRAND.terracotta,
  });
  ctx.fillRect(0, 0, w, bandH);
  ctx.restore();

  // Band foot, a terracotta hairline that anchors the pattern.
  ctx.fillStyle = BRAND.terracotta;
  ctx.fillRect(x, y + bandH - 4 * u, w, 4 * u);

  // Event mark, sitting on the band.
  ctx.fillStyle = BRAND.cream;
  ctx.textBaseline = "middle";
  ctx.font = `800 ${44 * u}px "${DISPLAY_FONT}"`;
  drawTracked(ctx, EVENT_NAME, x + pad, y + bandH / 2, 4 * u);

  ctx.fillStyle = BRAND.sand;
  ctx.font = `400 ${24 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, "BUILDER PASS", x + w - pad, y + bandH / 2, 3 * u, "right");

  /* ------------------------------------------------------------- photo */

  const photoX = x + pad;
  const photoY = y + bandH + 56 * u;
  const photoW = PHOTO_WINDOW.w * u;
  const photoH = PHOTO_WINDOW.h * u;

  // Whitewash mat behind the photo, the tile-and-plaster pairing.
  ctx.fillStyle = BRAND.cream;
  roundRect(
    ctx,
    photoX - 12 * u,
    photoY - 12 * u,
    photoW + 24 * u,
    photoH + 24 * u,
    28 * u,
  );
  ctx.fill();

  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, 18 * u);
  ctx.clip();

  if (state.photo) {
    drawPhoto(ctx, state.photo, photoX, photoY, photoW, photoH, state);
  } else {
    // Empty state: azulejo fills the window rather than a grey placeholder.
    ctx.save();
    ctx.translate(photoX, photoY);
    ctx.fillStyle = azulejoPattern(ctx, Math.round(180 * u), {
      bg: BRAND.indigo,
      line: BRAND.indigoLift,
      accent: BRAND.indigoLift,
    });
    ctx.fillRect(0, 0, photoW, photoH);
    ctx.restore();

    // Scrim, so the prompt stays legible over the busiest part of the motif.
    const label = "YOUR PHOTO";
    ctx.font = `400 ${26 * u}px "${MONO_FONT}"`;
    const labelW = ctx.measureText(label).width + 56 * u;
    ctx.fillStyle = BRAND.ink;
    roundRect(
      ctx,
      photoX + photoW / 2 - labelW / 2,
      photoY + photoH / 2 - 26 * u,
      labelW,
      52 * u,
      26 * u,
    );
    ctx.fill();

    ctx.fillStyle = BRAND.cream;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, photoX + photoW / 2, photoY + photoH / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  /* -------------------------------------------------------------- copy */

  const textTop = photoY + photoH + 74 * u;
  const maxTextW = w - pad * 2;

  const name = state.name.trim() || "Your name";
  ctx.fillStyle = BRAND.cream;
  ctx.textBaseline = "alphabetic";
  const fitted = fitText(ctx, name, maxTextW, 88 * u, 44 * u, 800, DISPLAY_FONT);
  ctx.font = `800 ${fitted.size}px "${DISPLAY_FONT}"`;
  ctx.fillText(fitted.text, x + pad, textTop);

  const stack = state.stack.trim();
  if (stack) {
    ctx.fillStyle = BRAND.sand;
    const s = fitText(ctx, stack, maxTextW, 30 * u, 20 * u, 400, MONO_FONT);
    ctx.font = `400 ${s.size}px "${MONO_FONT}"`;
    ctx.fillText(s.text, x + pad, textTop + 46 * u);
  }

  // Builder title on its terracotta rule.
  const title = state.title.trim();
  if (title) {
    const ruleY = textTop + 96 * u;
    ctx.fillStyle = BRAND.terracotta;
    ctx.fillRect(x + pad, ruleY, 56 * u, 5 * u);

    ctx.fillStyle = BRAND.terracottaLift;
    ctx.textBaseline = "middle";
    ctx.font = `700 ${30 * u}px "${DISPLAY_FONT}"`;
    drawTracked(ctx, title.toUpperCase(), x + pad + 80 * u, ruleY + 3 * u, 3 * u);
    ctx.textBaseline = "alphabetic";
  }

  /* --------------------------------------------------------- ticket stub */

  const stubY = y + h - 118 * u;
  drawPerforation(ctx, x + 28 * u, x + w - 28 * u, stubY, 22 * u, 3.5 * u);

  ctx.textBaseline = "middle";
  ctx.fillStyle = BRAND.sand;
  ctx.font = `400 ${26 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, "GOA, INDIA", x + pad, stubY + 60 * u, 3 * u);

  ctx.fillStyle = BRAND.terracottaLift;
  ctx.font = `700 ${28 * u}px "${DISPLAY_FONT}"`;
  drawTracked(ctx, HASHTAG, x + w - pad, stubY + 60 * u, 2 * u, "right");
  ctx.textBaseline = "alphabetic";

  drawGrain(ctx, x, y, w, h);
  ctx.restore();

  // Card edge.
  ctx.strokeStyle = "rgba(217, 199, 167, 0.22)";
  ctx.lineWidth = 2 * u;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 40 * u);
  ctx.stroke();
}

/* --------------------------------------------------------------- entrypoint */

export function drawCard(
  ctx: CanvasRenderingContext2D,
  state: CardState,
  variant: Variant = "card",
) {
  const { w, h } = SIZES[variant];
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (variant === "card") {
    drawBadge(ctx, state, 0, 0, w, h);
    ctx.restore();
    return;
  }

  // OG variant: the same badge, scaled down onto an azulejo ground so the
  // link preview shows the real graphic instead of a centre-cropped slice.
  ctx.fillStyle = BRAND.inkDeep;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = azulejoPattern(ctx, 150, {
    bg: BRAND.inkDeep,
    line: BRAND.tile,
    accent: BRAND.terracotta,
  });
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const badgeH = h - 96;
  const badgeW = badgeH * (SIZES.card.w / SIZES.card.h);
  const badgeX = 72;
  const badgeY = 48;

  ctx.save();
  ctx.shadowColor = "rgba(9, 22, 40, 0.55)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 16;
  drawBadge(ctx, state, badgeX, badgeY, badgeW, badgeH);
  ctx.restore();

  // Companion copy in the space beside the badge.
  const railX = badgeX + badgeW + 64;
  ctx.fillStyle = BRAND.cream;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 64px "${DISPLAY_FONT}"`;
  ctx.fillText("Building at", railX, h / 2 - 44);
  ctx.fillText(EVENT_NAME, railX, h / 2 + 32);

  ctx.fillStyle = BRAND.terracottaLift;
  ctx.font = `700 32px "${DISPLAY_FONT}"`;
  ctx.textBaseline = "middle";
  drawTracked(ctx, HASHTAG, railX, h / 2 + 92, 2);
  ctx.textBaseline = "alphabetic";

  ctx.restore();
}
