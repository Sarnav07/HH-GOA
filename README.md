# Hacker House Goa 2026 Builder Pass

A web tool that turns a photo into a branded Hacker House Goa 2026 builder
pass, ready to download and post. No account, no signup gate, one pass from
upload to finished graphic.

Built for the HH Goa 2026 shortlisting task, Format B (Builder ID Card).

**Live link:** add the deployed URL here after the first deploy.

## How the brief is met

| Requirement | Approach |
| --- | --- |
| Upload jpg, png, and HEIC | `createImageBitmap` covers jpg, png, and webp and applies EXIF rotation. HEIC falls back to `heic-to`, imported lazily so the wasm payload never loads for the majority who upload a jpg. |
| Speed, a few seconds not a loading screen | The card is drawn on a 2D canvas in the browser. A keystroke redraws in single-digit milliseconds, with no server round trip. |
| Handles real photos | Every photo is cover-fitted into the circular window on arrival, at any aspect ratio. The user can then drag to reposition and pinch or use a zoom slider. Nobody is asked to crop first. |
| On brand | The palette, lockup, and layout follow the official builder pass artwork. Colour values were sampled by histogram off the source artwork rather than estimated by eye. |
| Downloadable output | A real 1080 x 1350 PNG written to disk, not a canvas that only exists on screen. |
| Working share flow | Pre-filled caption carrying the generated builder class and `#FrameInGoa`. On mobile the native share sheet attaches the actual PNG. On desktop the pass downloads and the X composer opens. |
| Link preview shows the graphic | When a blob store is configured, a `/c/<id>` page serves a purpose-built 1200 x 630 image through `generateMetadata`, so the unfurled preview is the real card. |
| Mobile friendly | Mobile-first layout with the card preview above the fields, so it visibly reacts as you type. |

## Design

The identity is a vintage Indian travel-poster register in forest green, cream,
gold, and hot pink. The palette lives in `lib/brand.ts`, which is the single
source of truth read by both the canvas renderer and the Tailwind `@theme`
block.

| Token | Value | Role |
| --- | --- | --- |
| `cream` | `#F0E8D0` | page ground and card body |
| `forest` | `#004838` | header block, primary type |
| `tan` | `#E0D8B8` | inset info panel |
| `gold` | `#F8D028` | title pill and lockup highlight |
| `pink` | `#F02878` | actions, hashtag, framing |

Two accents rather than one, because the brand genuinely carries both. Their
roles are fixed and never swap: gold is the title, pink is action. Gold is
fill-only on light grounds, because as text on cream it fails WCAG contrast.
For the same reason the primary button uses `#C81D5F`, which clears AA at
4.5:1, where cream on `#F02878` reaches only 3.25:1.

The theme is locked light across every page, with one radius system: 16px
panels, 8px inputs, pill buttons. Type is Playfair Display for the lockup and
names, Cabinet Grotesk for interface text, and JetBrains Mono for labels, all
self-hosted.

The poster furniture (banded sun, palms, contour lines, dot grid, barcode,
parasol, cocktail, surfboard) is drawn procedurally in `lib/motifs.ts`. The card
header sits over a duotone treatment of a Goa coastline photograph,
pre-processed into `public/goa-coast.webp` so rendering it costs a single
`drawImage` rather than per-frame pixel work. The cream gutters flanking the
portrait carry a line-art beachscape built on one shared horizon, which is what
keeps it a composition rather than scattered clip-art.

## How it works

The card is hand-composed on a 2D canvas in `lib/render.ts`. Not html2canvas,
which mis-renders modern CSS and is slow, and not a server render, because a
network hop is not near-instant. A single `drawCard(ctx, state, variant)`
produces every output, so the live preview, the download, and the link preview
cannot drift apart.

Two variants come out of that one function:

| Variant | Size | Purpose |
| --- | --- | --- |
| `card` | 1080 x 1350 | the download, and the graphic people post |
| `og` | 1200 x 630 | link preview, sized so X does not centre-crop the name off |

Pan and zoom are held in a ref and painted on an animation frame rather than in
React state, because routing a drag through `setState` re-renders the tree on
every pointer event and stutters on a phone.

### Share to X

X's web intent accepts `text` and `url` only. It cannot attach an image. A
picture therefore reaches a post one of two ways, and the tool uses both:

- **On touch devices,** `navigator.share` hands the real PNG to the X app with
  the caption already written. The native sheet is gated on touch on purpose:
  desktop browsers also report that they can share files, but there the sheet is
  the operating system one, which does not offer X at all.
- **On desktop,** the pass downloads and the X composer opens with the caption
  prefilled, ready for the file to be attached. The composer window is opened
  synchronously before any `await`, because once a promise resolves the user
  activation has lapsed and popup blockers suppress it.

When a blob store is configured, a third action appears that publishes the card
and copies a `/c/<id>` link whose Open Graph preview renders the card itself.

## Project structure

```
app/            routes, layout, API, share landing page
components/     Studio, CardPreview, Dropzone, Actions
lib/
  brand.ts      palette and event copy, single source of truth
  render.ts     the card renderer, both variants
  motifs.ts     procedural poster furniture
  decode.ts     file to ImageBitmap, including HEIC
  title.ts      deterministic builder title and serial
  coast.ts      duotone header asset loader
  fonts.ts      gates the first canvas paint on webfonts
  store.ts      blob storage for shared cards
public/         self-hosted fonts, duotone coastline
.verify/        development verification scripts, not shipped
```

## Running locally

```bash
git clone https://github.com/Sarnav07/HH-GOA.git
cd HH-GOA
npm install
npm run dev
```

Open `http://localhost:3000`.

That covers the whole flow: upload, fields, live preview, download, and share.
Link sharing is the one optional extra. Copy `.env.example` to `.env.local` and
set `BLOB_READ_WRITE_TOKEN` from the Vercel dashboard under Storage, Blob.
Without it the link action is simply absent rather than present and broken.

## Deploying

**Dashboard:** import the repository at vercel.com/new and deploy. The Next.js
application is at the repository root, so the detected defaults are correct and
nothing needs changing.

**CLI:**

```bash
npx vercel link
npx vercel --prod
```

For the link preview, create a Blob store under Storage in the project
dashboard and connect it. `BLOB_READ_WRITE_TOKEN` is injected automatically;
redeploy so it is picked up.

After deploying, paste a generated `/c/<id>` URL into
`cards-dev.twitter.com/validator` and confirm the preview shows the actual
card. This cannot be tested on localhost, because X has to fetch the URL itself.

## Verification

`.verify/` holds two development scripts, neither of which ships:

```bash
npx tsx .verify/render-proof.mts   # renders the card variants to PNG headlessly
node .verify/e2e.mjs <outDir>      # drives the real page and screenshots it
node .verify/e2e.mjs <outDir> heic # the same run through a real HEIC file
```

`render-proof` runs `lib/render.ts` against a Skia canvas, which is how the card
was designed and reviewed without round-tripping through a browser. It covers
the empty state, portrait and landscape sources, a name long enough to force
the auto-fit to truncate, and the OG variant.

`e2e` drives the running application over the Chrome DevTools Protocol. It
injects a real photo into the file input, types the fields, drives the zoom
slider with genuine mouse and keyboard events, asserts that the share action
opens X with the hashtag intact, and captures phone and desktop viewports.
Canvas assertions hash a region rather than sampling one pixel, because a
centre-anchored zoom leaves the centre pixel unchanged and made an early probe
report a false pass.

## Tech stack

Next.js 16 with the App Router, React 19, Tailwind v4, Motion for the entry
transitions, and Vercel Blob for shared cards. Fonts are self-hosted rather
than linked, because the canvas has to gate its first paint on them or the
downloaded PNG ships in a fallback typeface.
