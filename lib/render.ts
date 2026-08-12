/**
 * The card renderer.
 *
 * One pure-ish function of (state, variant) draws the whole graphic, so the
 * live preview, the downloaded PNG, and the OG link-preview image can never
 * drift apart. Everything is hand-composed on a 2D context: no html2canvas
 * (mis-renders modern CSS, slow) and no server round trip (the brief asks for
 * near-instant, and a network hop is not that).
 *
 * Composition follows the official Hacker House Goa builder pass: forest
 * header block over a duotone coastline, circular portrait in gold and pink
 * rings, gold title pill, tan info grid, barcode and hashtag footer.
 */
import {
  BRAND,
  DISPLAY_FONT,
  EVENT_DATES,
  EVENT_MISSION,
  EVENT_MOTTO,
  EVENT_NAME,
  EVENT_PLACE,
  EVENT_TAGLINE,
  HASHTAG,
  MONO_FONT,
  SANS_FONT,
} from "./brand";
import { coastImage } from "./coast";
import {
  drawBarcode,
  drawContours,
  drawDotGrid,
  drawPalm,
  drawStripedSun,
  roundRect,
} from "./motifs";

export type CardState = {
  name: string;
  stack: string;
  title: string;
  serial: string;
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
 * The circular photo window in card pixels. Exported because the drag handler
 * has to translate screen movement into the same units drawPhoto pans in, and
 * the two silently disagreeing would make dragging feel wrong on one axis.
 */
export const PHOTO_WINDOW = { cx: 540, cy: 540, r: 180 } as const;

export const emptyState = (): CardState => ({
  name: "",
  stack: "",
  title: "",
  serial: "HH-GOA-000000",
  photo: null,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
});

/* ------------------------------------------------------------------ helpers */

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
  align: "left" | "right" | "center" = "left",
) {
  const chars = [...text];
  const width =
    chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) +
    tracking * Math.max(0, chars.length - 1);

  let cursor = x;
  if (align === "right") cursor = x - width;
  if (align === "center") cursor = x - width / 2;

  for (const c of chars) {
    ctx.fillText(c, cursor, y);
    cursor += ctx.measureText(c).width + tracking;
  }
  return width;
}

/**
 * Cover-fits the photo into the circular window, then applies the user's pan
 * and zoom. Portrait, landscape, square, and off-centre crops all land
 * somewhere sane without the user being asked to crop first.
 */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  photo: ImageBitmap,
  cx: number,
  cy: number,
  r: number,
  state: CardState,
) {
  const d = r * 2;
  const scale = Math.max(d / photo.width, d / photo.height) * state.zoom;
  const dw = photo.width * scale;
  const dh = photo.height * scale;

  // Pan is clamped so the photo can never be dragged clear of its window.
  const slackX = Math.max(0, (dw - d) / 2);
  const slackY = Math.max(0, (dh - d) / 2);
  const panX = Math.max(-slackX, Math.min(slackX, state.offsetX * d));
  const panY = Math.max(-slackY, Math.min(slackY, state.offsetY * d));

  ctx.drawImage(photo, cx - dw / 2 + panX, cy - dh / 2 + panY, dw, dh);
}

/** Fine grain. Kept subtle and drawn once per render, never animated. */
function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const dots = Math.floor((w * h) / 1100);

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
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = BRAND.forestDeep;
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
  const pad = 74 * u;
  const innerW = w - pad * 2;

  ctx.save();
  roundRect(ctx, x, y, w, h, 26 * u);
  ctx.clip();

  /* ------------------------------------------------------------- framing */

  // Pink outer frame, gold hairline inset, cream body. The reference's
  // three-step edge, which is what makes it read as printed stock.
  ctx.fillStyle = BRAND.pink;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = BRAND.cream;
  roundRect(ctx, x + 18 * u, y + 18 * u, w - 36 * u, h - 36 * u, 16 * u);
  ctx.fill();

  ctx.strokeStyle = BRAND.gold;
  ctx.lineWidth = 3 * u;
  roundRect(ctx, x + 30 * u, y + 30 * u, w - 60 * u, h - 60 * u, 12 * u);
  ctx.stroke();

  /* -------------------------------------------------------------- header */

  const headX = x + 40 * u;
  const headY = y + 40 * u;
  const headW = w - 80 * u;
  const headH = 400 * u;

  ctx.save();
  roundRect(ctx, headX, headY, headW, headH, 8 * u);
  ctx.clip();

  ctx.fillStyle = BRAND.forest;
  ctx.fillRect(headX, headY, headW, headH);

  // Duotone coastline, washed back so the lockup stays the loudest thing here.
  const coast = coastImage();
  if (coast) {
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.drawImage(coast, headX, headY, headW, headH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.44;
    ctx.fillStyle = BRAND.forest;
    ctx.fillRect(headX, headY, headW, headH);
    ctx.restore();
  }

  // Contour lines and the banded sun, the reference's landscape shorthand.
  ctx.save();
  ctx.globalAlpha = 0.3;
  drawContours(
    ctx,
    headX,
    headY + headH * 0.42,
    headW,
    headH * 0.55,
    BRAND.gold,
    2 * u,
    8,
  );
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85;
  drawStripedSun(
    ctx,
    headX + headW * 0.845,
    headY + headH * 0.5,
    56 * u,
    BRAND.gold,
    BRAND.forest,
  );
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.5;
  drawPalm(ctx, headX + headW * 0.7, headY + headH * 0.66, 92 * u, BRAND.gold, 2.4 * u, 1);
  drawPalm(ctx, headX + headW * 0.94, headY + headH * 0.72, 66 * u, BRAND.gold, 2.2 * u, -1);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  drawDotGrid(ctx, headX + headW * 0.72, headY + 30 * u, 9, 3, 13 * u, 2 * u, BRAND.pink);
  ctx.restore();

  /* ------------------------------------------------------- header type */

  const tx = headX + 34 * u;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BRAND.gold;
  ctx.font = `700 ${34 * u}px "${SANS_FONT}"`;
  drawTracked(ctx, EVENT_NAME, tx, headY + 62 * u, 2 * u);

  ctx.fillStyle = BRAND.cream;
  ctx.font = `400 ${17 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, "OFFICIAL BUILDER PASS", tx, headY + 90 * u, 2.2 * u);

  // The lockup, in the reference's tri-colour split.
  const lockSize = 78 * u;
  ctx.font = `900 ${lockSize}px "${DISPLAY_FONT}"`;
  ctx.fillStyle = BRAND.cream;
  const hackerW = drawTracked(ctx, "HACKER", tx, headY + 188 * u, 1 * u);

  ctx.fillStyle = BRAND.pink;
  const houseW = drawTracked(ctx, "HOUSE", tx, headY + 264 * u, 1 * u);

  ctx.fillStyle = BRAND.gold;
  ctx.font = `900 ${lockSize * 0.72}px "${DISPLAY_FONT}"`;
  drawTracked(ctx, "GOA", tx + houseW + 20 * u, headY + 264 * u, 1 * u);

  ctx.fillStyle = BRAND.gold;
  ctx.font = `700 ${17 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, EVENT_TAGLINE, tx, headY + 322 * u, 1.6 * u);

  void hackerW;
  ctx.restore();

  /* --------------------------------------------------------------- photo */

  const cx = x + PHOTO_WINDOW.cx * u;
  const cy = y + PHOTO_WINDOW.cy * u;
  const r = PHOTO_WINDOW.r * u;

  // Pink ring outside, gold ring inside, matching the reference's double edge.
  ctx.fillStyle = BRAND.pink;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BRAND.gold;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 11 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (state.photo) {
    drawPhoto(ctx, state.photo, cx, cy, r, state);
  } else {
    ctx.fillStyle = BRAND.forest;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.save();
    ctx.globalAlpha = 0.4;
    drawContours(ctx, cx - r, cy - r * 0.2, r * 2, r * 1.2, BRAND.gold, 2 * u, 6);
    ctx.restore();

    ctx.fillStyle = BRAND.cream;
    ctx.font = `400 ${21 * u}px "${MONO_FONT}"`;
    ctx.textBaseline = "middle";
    drawTracked(ctx, "YOUR PHOTO", cx, cy, 2 * u, "center");
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  /* ---------------------------------------------------------------- name */

  const name = state.name.trim() || "Your name";
  ctx.fillStyle = BRAND.forest;
  ctx.textAlign = "center";
  const fitted = fitText(ctx, name, innerW - 40 * u, 76 * u, 38 * u, 900, DISPLAY_FONT);
  ctx.font = `900 ${fitted.size}px "${DISPLAY_FONT}"`;
  ctx.fillText(fitted.text, x + w / 2, y + 812 * u);

  const stack = state.stack.trim();
  if (stack) {
    ctx.fillStyle = BRAND.pinkDeep;
    ctx.font = `700 ${22 * u}px "${MONO_FONT}"`;
    ctx.textAlign = "left";
    drawTracked(
      ctx,
      stack.toUpperCase(),
      x + w / 2,
      y + 850 * u,
      2.4 * u,
      "center",
    );
  }
  ctx.textAlign = "left";

  /* ----------------------------------------------------------- title pill */

  const title = state.title.trim();
  if (title) {
    const pillY = y + 880 * u;
    const pillH = 106 * u;
    ctx.fillStyle = BRAND.gold;
    roundRect(ctx, x + pad, pillY, innerW, pillH, 14 * u);
    ctx.fill();

    ctx.fillStyle = BRAND.forest;
    ctx.font = `400 ${16 * u}px "${MONO_FONT}"`;
    drawTracked(ctx, "BUILDER TITLE", x + w / 2, pillY + 36 * u, 2.4 * u, "center");

    const t = fitText(
      ctx,
      title.toUpperCase(),
      innerW - 56 * u,
      36 * u,
      20 * u,
      800,
      SANS_FONT,
    );
    ctx.font = `800 ${t.size}px "${SANS_FONT}"`;
    ctx.fillStyle = BRAND.forestDeep;
    drawTracked(ctx, t.text, x + w / 2, pillY + 78 * u, 1.6 * u, "center");
  }

  /* ----------------------------------------------------------- info panel */

  const infoY = y + 1008 * u;
  const infoH = 176 * u;
  ctx.fillStyle = BRAND.tan;
  roundRect(ctx, x + pad, infoY, innerW, infoH, 14 * u);
  ctx.fill();
  ctx.strokeStyle = BRAND.forest;
  ctx.lineWidth = 2 * u;
  roundRect(ctx, x + pad, infoY, innerW, infoH, 14 * u);
  ctx.stroke();

  const colL = x + pad + 30 * u;
  const colR = x + w / 2 + 16 * u;

  const cell = (
    label: string,
    value: string,
    cxx: number,
    cyy: number,
    valueColor: string,
  ) => {
    ctx.fillStyle = BRAND.forest;
    ctx.font = `400 ${14 * u}px "${MONO_FONT}"`;
    drawTracked(ctx, label, cxx, cyy, 2.2 * u);

    ctx.fillStyle = valueColor;
    ctx.font = `700 ${21 * u}px "${SANS_FONT}"`;
    drawTracked(ctx, value, cxx, cyy + 30 * u, 0.6 * u);
  };

  cell("BASE CAMP", EVENT_PLACE, colL, infoY + 44 * u, BRAND.forestDeep);
  cell("DATES", EVENT_DATES, colL, infoY + 114 * u, BRAND.forestDeep);
  cell("MISSION", EVENT_MISSION, colR, infoY + 44 * u, BRAND.forestDeep);

  ctx.fillStyle = BRAND.forest;
  ctx.font = `400 ${14 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, EVENT_MOTTO, colR, infoY + 144 * u, 1.6 * u);

  /* --------------------------------------------------------------- footer */

  const footY = y + 1214 * u;
  drawBarcode(ctx, x + pad, footY, 246 * u, 46 * u, state.serial, BRAND.forestDeep);

  ctx.fillStyle = BRAND.forest;
  ctx.font = `400 ${14 * u}px "${MONO_FONT}"`;
  drawTracked(ctx, state.serial, x + pad, footY + 68 * u, 1.6 * u);

  const tagW = 300 * u;
  const tagX = x + w - pad - tagW;
  ctx.fillStyle = BRAND.pink;
  roundRect(ctx, tagX, footY - 4 * u, tagW, 56 * u, 28 * u);
  ctx.fill();

  ctx.fillStyle = BRAND.cream;
  ctx.font = `800 ${24 * u}px "${SANS_FONT}"`;
  ctx.textBaseline = "middle";
  drawTracked(ctx, HASHTAG.toUpperCase(), tagX + tagW / 2, footY + 24 * u, 1.4 * u, "center");
  ctx.textBaseline = "alphabetic";

  drawGrain(ctx, x, y, w, h);
  ctx.restore();
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

  // OG variant: the same badge, scaled down onto a forest ground so the link
  // preview shows the real graphic instead of a centre-cropped slice.
  ctx.fillStyle = BRAND.forest;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.25;
  drawContours(ctx, 0, h * 0.3, w, h * 0.7, BRAND.gold, 2, 10);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  drawStripedSun(ctx, w * 0.88, h * 0.24, 62, BRAND.gold, BRAND.forest);
  ctx.restore();

  const badgeH = h - 96;
  const badgeW = badgeH * (SIZES.card.w / SIZES.card.h);
  const badgeX = 72;
  const badgeY = 48;

  ctx.save();
  ctx.shadowColor = "rgba(0, 26, 18, 0.5)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 16;
  drawBadge(ctx, state, badgeX, badgeY, badgeW, badgeH);
  ctx.restore();

  // Companion copy in the space beside the badge.
  const railX = badgeX + badgeW + 68;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = BRAND.cream;
  ctx.font = `900 62px "${DISPLAY_FONT}"`;
  ctx.fillText("HACKER", railX, h / 2 - 46);
  ctx.fillStyle = BRAND.pink;
  ctx.fillText("HOUSE", railX, h / 2 + 22);

  ctx.fillStyle = BRAND.gold;
  ctx.font = `700 26px "${MONO_FONT}"`;
  drawTracked(ctx, `GOA · ${EVENT_DATES}`, railX, h / 2 + 66, 2);

  ctx.fillStyle = BRAND.cream;
  ctx.font = `800 30px "${SANS_FONT}"`;
  drawTracked(ctx, HASHTAG.toUpperCase(), railX, h / 2 + 124, 1.6);

  ctx.restore();
}
