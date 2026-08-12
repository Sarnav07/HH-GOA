/**
 * File to ImageBitmap.
 *
 * The brief calls for jpg, png, and HEIC straight off an iPhone, at any aspect
 * ratio, with no pre-cropping. createImageBitmap handles the common formats and
 * applies EXIF rotation for us; HEIC decoding is lazy so the wasm payload never
 * loads for the large majority who upload a jpg.
 */

const MAX_BYTES = 20 * 1024 * 1024;
/** Long-edge cap. Keeps redraws fast on a phone without visible quality loss. */
const MAX_EDGE = 2000;

export class DecodeError extends Error {}

const isHeic = (file: File) =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

async function toBitmap(source: Blob) {
  return createImageBitmap(source, { imageOrientation: "from-image" });
}

/** Downscales in one step. ImageBitmap resizing is done by the browser. */
async function downscale(bitmap: ImageBitmap) {
  const longEdge = Math.max(bitmap.width, bitmap.height);
  if (longEdge <= MAX_EDGE) return bitmap;

  const ratio = MAX_EDGE / longEdge;
  const resized = await createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * ratio),
    resizeHeight: Math.round(bitmap.height * ratio),
    resizeQuality: "high",
  });
  bitmap.close();
  return resized;
}

export async function decodePhoto(file: File): Promise<ImageBitmap> {
  if (file.size > MAX_BYTES) {
    throw new DecodeError("That file is over 20MB. Try a smaller one.");
  }

  // Safari on recent iOS decodes HEIC natively, so try the cheap path first
  // even when the extension says HEIC.
  try {
    return await downscale(await toBitmap(file));
  } catch {
    if (!isHeic(file)) {
      throw new DecodeError("We could not read that file as an image.");
    }
  }

  try {
    const { heicTo } = await import("heic-to");
    const converted = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.92,
    });
    return await downscale(await toBitmap(converted));
  } catch {
    throw new DecodeError(
      "We could not read that iPhone photo. Try sharing it as JPEG.",
    );
  }
}
