/**
 * Seamless azulejo tile, drawn procedurally.
 *
 * The motif is the Portuguese blue-and-white tile geometry you see all over
 * Goa: a rosette at every lattice point, a quatrefoil in the centre of each
 * tile, and small lozenges on the edge midpoints.
 *
 * Seamlessness comes from drawing every boundary shape in full at BOTH ends of
 * the axis it straddles. Canvas clips each one to the tile, and the repeating
 * pattern reassembles the halves.
 */

type TileColors = {
  /** Tile ground. */
  bg: string;
  /** Line work. */
  line: string;
  /** Accent used for the centre pip and edge lozenges. */
  accent: string;
};

function drawMotif(
  ctx: CanvasRenderingContext2D,
  s: number,
  colors: TileColors,
) {
  const h = s / 2;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = colors.line;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Lattice rosettes. Drawn at all four corners so each contributes a quarter.
  const corners: [number, number][] = [
    [0, 0],
    [s, 0],
    [0, s],
    [s, s],
  ];
  for (const [cx, cy] of corners) {
    ctx.lineWidth = s * 0.024;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // A second quatrefoil inside the ring, rotated 45 degrees off the one in
    // the tile centre. Radial spokes were tried here first and read as a
    // ship's wheel; a ring of beads read as a sewing button. Repeating the
    // flower is what makes the field read as tile.
    ctx.lineWidth = s * 0.016;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * s * 0.085,
        cy + Math.sin(a) * s * 0.085,
        s * 0.095,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    ctx.fillStyle = colors.line;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.032, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centre quatrefoil: four overlapping circles around the tile centre.
  ctx.lineWidth = s * 0.022;
  const petal = s * 0.135;
  const offset = s * 0.125;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(
      h + Math.cos(a) * offset,
      h + Math.sin(a) * offset,
      petal,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // Centre pip.
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(h, h, s * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // Edge lozenges. Each is drawn on both opposing edges so the halves pair up
  // with the neighbouring tile.
  const midpoints: [number, number][] = [
    [h, 0],
    [h, s],
    [0, h],
    [s, h],
  ];
  const r = s * 0.055;
  for (const [mx, my] of midpoints) {
    ctx.beginPath();
    ctx.moveTo(mx, my - r);
    ctx.lineTo(mx + r, my);
    ctx.lineTo(mx, my + r);
    ctx.lineTo(mx - r, my);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Renders the tile once into an offscreen canvas sized `size` x `size`.
 * Cached per (size + colour) key because createPattern is called on every
 * card redraw and re-rasterising the motif each keystroke is wasteful.
 */
const cache = new Map<string, HTMLCanvasElement>();

export function azulejoTile(size: number, colors: TileColors) {
  const key = `${size}|${colors.bg}|${colors.line}|${colors.accent}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  drawMotif(ctx, size, colors);

  cache.set(key, canvas);
  return canvas;
}

export function azulejoPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  colors: TileColors,
) {
  const pattern = ctx.createPattern(azulejoTile(size, colors), "repeat");
  if (!pattern) throw new Error("Could not build azulejo pattern");
  return pattern;
}
