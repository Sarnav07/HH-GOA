import { list, put } from "@vercel/blob";

/**
 * Share-card storage.
 *
 * Two PNGs per card live under a shared `c/<id>/` prefix, which means the
 * share page can recover both URLs from the id alone with a single list call.
 * No database, no session, and nothing for the user to sign into.
 */

export type StoredCard = { cardUrl: string; ogUrl: string };

export const hasBlobStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** URL-safe, short enough to sit in a tweet, long enough not to collide. */
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function storeCard(id: string, card: Blob, og: Blob) {
  const options = {
    access: "public" as const,
    contentType: "image/png",
    addRandomSuffix: false,
    // The card is immutable once written, so let the CDN hold it.
    cacheControlMaxAge: 31536000,
  };

  const [cardBlob, ogBlob] = await Promise.all([
    put(`c/${id}/card.png`, card, options),
    put(`c/${id}/og.png`, og, options),
  ]);

  return { cardUrl: cardBlob.url, ogUrl: ogBlob.url } satisfies StoredCard;
}

export async function findCard(id: string): Promise<StoredCard | null> {
  // Ids come off a URL segment, so refuse anything that could walk the prefix.
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) return null;
  if (!hasBlobStore()) return null;

  const { blobs } = await list({ prefix: `c/${id}/`, limit: 4 });
  const cardUrl = blobs.find((b) => b.pathname.endsWith("card.png"))?.url;
  const ogUrl = blobs.find((b) => b.pathname.endsWith("og.png"))?.url;

  return cardUrl && ogUrl ? { cardUrl, ogUrl } : null;
}
