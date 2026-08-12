/**
 * The duotone Goa coastline band that sits behind the card header.
 *
 * Treated offline into public/goa-coast.webp, so drawing it is a single
 * drawImage with no per-frame pixel work. Loaded once into a module-level
 * promise, the same pattern as fontsReady().
 *
 * The card must still render if this never arrives, so callers treat a null
 * result as "skip the band" rather than as an error.
 */
let pending: Promise<CanvasImageSource | null> | null = null;
let resolved: CanvasImageSource | null = null;

export function coastImage() {
  return resolved;
}

/**
 * Test seam. The headless proof renderer has no DOM Image, so it preloads the
 * same asset through Skia and injects it here.
 */
export function __setCoast(image: CanvasImageSource) {
  resolved = image;
  pending = Promise.resolve(image);
}

export function coastReady() {
  if (pending) return pending;

  pending = new Promise<CanvasImageSource | null>((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const img = new Image();
    img.onload = () => {
      resolved = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = "/goa-coast.webp";
  });

  return pending;
}
