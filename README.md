# Frame in Goa

Builder pass generator for HH Goa 2026. Upload a photo, add a name and a stack,
get a branded card you can download and post. No account, no signup gate, one
pass start to finish.

Built for the HH Goa 2026 shortlisting task, Format B (Builder ID Card).

## Design

"Azulejo Dusk". The signature is the Portuguese blue-and-white tile geometry
Goa actually has, over a dusk-indigo ground, with laterite terracotta as the
single accent. The tile motif is drawn procedurally in `lib/azulejo.ts` and is
seamless, so it works as a pattern at any scale.

The theme is locked dark across every page. One accent colour, one radius
system (16px panels, 8px inputs, pill buttons). Display type is Cabinet
Grotesk, mono is JetBrains Mono, both self-hosted.

## How it works

The card is hand-composed on a 2D canvas in `lib/render.ts`. Not html2canvas
(mis-renders modern CSS and is slow) and not a server render (a network hop is
not "near-instant"). One `drawCard(ctx, state, variant)` produces every output,
so the live preview, the download, and the link preview cannot drift apart.

Two variants:

| Variant | Size | Purpose |
| --- | --- | --- |
| `card` | 1080 x 1350 | download, and the graphic people post |
| `og` | 1200 x 630 | link preview, so X does not centre-crop the name off |

Photos are decoded with `createImageBitmap`, which handles jpg/png/webp and
applies EXIF rotation. HEIC falls back to `heic-to`, imported lazily so the
wasm never loads for the majority who upload a jpg. Every photo is cover-fitted
into the window on arrival, then the user can drag to reposition and pinch or
scroll to zoom. Nobody is asked to crop first.

Share to X takes two paths. On a phone, `navigator.share` hands the real PNG to
the X app with the caption already written. Everywhere else the card is
published to Vercel Blob under a `c/<id>/` prefix and the tweet composer opens
with a link to `/c/<id>`, whose `generateMetadata` points `og:image` at the
1200x630 variant.

## Running it

```bash
npm install
npm run dev
```

Sharing by link needs a Vercel Blob store. Copy `.env.example` to `.env.local`
and fill in `BLOB_READ_WRITE_TOKEN` (Vercel dashboard, Storage > Blob). Without
it, download and the mobile share sheet still work; the desktop share button
reports that link sharing is not configured rather than failing silently.

## Deploying

```bash
npx vercel link
npx vercel env add BLOB_READ_WRITE_TOKEN production
npx vercel --prod
```

After deploying, paste a generated `/c/<id>` URL into
`cards-dev.twitter.com/validator` and confirm the preview shows the actual card.
This cannot be tested on localhost, because X has to fetch the URL.

## Verification aids

`.verify/` holds two development scripts, neither shipped:

```bash
npx tsx .verify/render-proof.mts   # renders the card variants to PNG headlessly
node .verify/e2e.mjs               # drives the real page over CDP and screenshots it
```

`render-proof` runs `lib/render.ts` against a Skia canvas, which is how the card
was designed without round-tripping through a browser. `e2e` injects a real
photo into the file input, types the fields, and captures phone and desktop
viewports. Both need their fixtures fetched first (see the script headers).
