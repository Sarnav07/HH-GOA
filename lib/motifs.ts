/**
 * Poster motifs.
 *
 * The vector furniture the official builder pass is built from: the banded
 * sun, single-stroke palms, loose contour lines, the dotted grid, and the
 * barcode. All geometric, all drawn straight onto the card context, so there
 * is no raster asset to load and they stay sharp at any card size.
 */

/** Deterministic 32-bit hash. Shared by the barcode and the serial number. */
export function hash32(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The gold sun with horizontal bands cut out of it. */
export function drawStripedSun(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  cut: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = fill;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Bands widen toward the base, the way the reference sun does.
  ctx.fillStyle = cut;
  const bands = 7;
  for (let i = 1; i <= bands; i++) {
    const t = i / (bands + 1);
    const y = cy - r + t * r * 2;
    ctx.fillRect(cx - r, y, r * 2, r * 0.055 * (0.5 + t));
  }
  ctx.restore();
}

/**
 * A palm drawn as a curved trunk plus fronds, one stroke each. Kept as line
 * work rather than filled shapes, which is what stops it reading as clip-art.
 */
export function drawPalm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  stroke: string,
  lineWidth: number,
  lean = 1,
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.1, y - h * 0.55, x + lean * h * 0.16, y - h);
  ctx.stroke();

  const tipX = x + lean * h * 0.16;
  const tipY = y - h;
  const frond = h * 0.34;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    const dx = Math.cos(a) * frond;
    const dy = Math.sin(a) * frond * 0.55;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + dx * 0.55, tipY + dy - frond * 0.3, tipX + dx, tipY + dy);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Cocktail glass: bowl on a stem and foot, with a straw and a fruit wedge.
 * `y` is the base, so it stands on the same horizon as everything else.
 */
export function drawCocktail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  stroke: string,
  lineWidth: number,
) {
  const bowl = h * 0.46;
  const rim = y - h;
  const half = bowl * 0.62;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Bowl, rim across the top down to the point where the stem starts.
  ctx.beginPath();
  ctx.moveTo(x - half, rim);
  ctx.lineTo(x + half, rim);
  ctx.lineTo(x, rim + bowl);
  ctx.closePath();
  ctx.stroke();

  // Stem and foot.
  ctx.beginPath();
  ctx.moveTo(x, rim + bowl);
  ctx.lineTo(x, y);
  ctx.moveTo(x - h * 0.2, y);
  ctx.lineTo(x + h * 0.2, y);
  ctx.stroke();

  // Straw leaning out of the glass.
  ctx.beginPath();
  ctx.moveTo(x + half * 0.25, rim + bowl * 0.45);
  ctx.lineTo(x + half * 1.1, rim - h * 0.22);
  ctx.stroke();

  // Fruit wedge hooked on the rim.
  ctx.beginPath();
  ctx.arc(x - half * 0.92, rim, h * 0.11, Math.PI * 0.15, Math.PI * 1.15);
  ctx.stroke();
  ctx.restore();
}

/** Beach parasol: scalloped canopy on a pole, planted at `y`. */
export function drawParasol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  stroke: string,
  lineWidth: number,
) {
  const top = y - h;
  const span = h * 0.62;
  const scallops = 4;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Canopy edge, drawn as a run of shallow arcs so it reads as fabric panels.
  const edgeY = top + h * 0.24;
  ctx.beginPath();
  ctx.moveTo(x - span, edgeY);
  for (let i = 0; i < scallops; i++) {
    const x0 = x - span + (i * span * 2) / scallops;
    const x1 = x - span + ((i + 1) * span * 2) / scallops;
    ctx.quadraticCurveTo((x0 + x1) / 2, edgeY + h * 0.1, x1, edgeY);
  }
  ctx.stroke();

  // Dome from the edge up to the finial.
  ctx.beginPath();
  ctx.moveTo(x - span, edgeY);
  ctx.quadraticCurveTo(x, top - h * 0.16, x + span, edgeY);
  ctx.stroke();

  // Panel ribs and the pole.
  ctx.beginPath();
  ctx.moveTo(x - span * 0.5, edgeY + h * 0.04);
  ctx.lineTo(x, top);
  ctx.moveTo(x + span * 0.5, edgeY + h * 0.04);
  ctx.lineTo(x, top);
  ctx.moveTo(x, top);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

/** Surfboard stood on its tail, leaning. `y` is where the tail meets ground. */
export function drawSurfboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  stroke: string,
  lineWidth: number,
  lean = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((lean * 11 * Math.PI) / 180);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";

  const w = h * 0.26;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-w, -h * 0.28, -w, -h * 0.74, 0, -h);
  ctx.bezierCurveTo(w, -h * 0.74, w, -h * 0.28, 0, 0);
  ctx.stroke();

  // Stringer down the centre.
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.1);
  ctx.lineTo(0, -h * 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Loose horizontal contours, the reference's landscape shorthand. */
export function drawContours(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  lineWidth: number,
  lines = 9,
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const baseY = y + t * h;
    const amp = h * 0.06 * (1 - t * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.bezierCurveTo(
      x + w * 0.3,
      baseY - amp,
      x + w * 0.62,
      baseY + amp,
      x + w,
      baseY - amp * 0.4,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** The dotted rectangle that sits in the header's top right. */
export function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  step: number,
  r: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.arc(x + c * step, y + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Barcode with bar widths derived from the serial, so the same builder always
 * gets the same bars instead of a fresh random pattern on every keystroke.
 */
export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
  fill: string,
) {
  let s = hash32(seed) || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  ctx.save();
  ctx.fillStyle = fill;
  let cursor = x;
  while (cursor < x + w) {
    const bar = (0.4 + next() * 1.9) * (w / 90);
    const gap = (0.4 + next() * 1.1) * (w / 90);
    if (cursor + bar > x + w) break;
    ctx.fillRect(cursor, y, bar, h);
    cursor += bar + gap;
  }
  ctx.restore();
}

/** Rounded-rectangle path helper, shared by the renderer. */
export function roundRect(
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
