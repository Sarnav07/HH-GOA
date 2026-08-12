/**
 * Canvas draws with whatever font is resolved at the moment ctx.fillText runs.
 * If the webfonts have not landed yet it silently falls back to Helvetica and
 * ships a card in the wrong typeface, which is the classic canvas bug. Gate
 * every first draw on this.
 */
const FACES = [
  '800 16px "Cabinet Grotesk"',
  '700 16px "Cabinet Grotesk"',
  '500 16px "Cabinet Grotesk"',
  '400 16px "JetBrains Mono"',
  '700 16px "JetBrains Mono"',
];

let ready: Promise<void> | null = null;

export function fontsReady() {
  if (ready) return ready;

  ready = (async () => {
    if (typeof document === "undefined" || !document.fonts) return;
    await Promise.all(FACES.map((f) => document.fonts.load(f, "Aa0")));
    await document.fonts.ready;
  })();

  return ready;
}
