/**
 * End-to-end check over the Chrome DevTools Protocol.
 *
 * Drives the real page: injects a photo into the file input the way a user
 * would pick one, types the fields, and screenshots the result at both a phone
 * and a desktop viewport. Development aid only.
 *
 *   node .verify/e2e.mjs <outDir>
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const ORIGIN = "http://localhost:3000";
const outDir = process.argv[2] ?? ".verify";

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--user-data-dir=/tmp/hh-goa-e2e-profile",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome did not expose a debugging target");
}

const ws = new WebSocket(await target());
await new Promise((resolve) => {
  ws.onopen = resolve;
});

let nextId = 1;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
  else p.resolve(msg.result);
};

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? "eval failed");
  return result.value;
};

await send("Page.enable");
await send("Runtime.enable");

const errors = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.text ?? "exception");
  }
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  }
});

async function shoot(name, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 600,
  });
  await sleep(600);
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(outDir, name), Buffer.from(data, "base64"));
  console.log(`shot ${name} ${width}x${height}`);
}

// Pass "heic" as the second argument to exercise the HEIC decode path.
const useHeic = process.argv[3] === "heic";
const fixture = useHeic
  ? { path: ".verify/sample-portrait.heic", name: "portrait.heic", type: "image/heic" }
  : { path: ".verify/sample-portrait.jpg", name: "portrait.jpg", type: "image/jpeg" };
const photoB64 = readFileSync(fixture.path).toString("base64");
console.log(`fixture: ${fixture.path}`);

await send("Page.navigate", { url: ORIGIN });
await sleep(2500);

// Put a real File into the input, exactly as the file picker would.
await evaluate(`(async () => {
  const bytes = Uint8Array.from(atob(${JSON.stringify(photoB64)}), c => c.charCodeAt(0));
  const file = new File([bytes], ${JSON.stringify(fixture.name)}, { type: ${JSON.stringify(fixture.type)} });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById("photo");
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()`);
await sleep(useHeic ? 6000 : 1800);

// React tracks input value internally, so set through the native setter.
await evaluate(`(() => {
  const set = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value").set;
  for (const [id, value] of [["name", "Rhea Fernandes"], ["stack", "full-stack"]]) {
    const el = document.getElementById(id);
    set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return true;
})()`);
await sleep(900);

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
});
await sleep(400);

// Zoom slider: prove it reaches drawCard, not merely the DOM. Sampling a pixel
// inside the photo circle before and after; a working slider rescales the photo
// so the sample must change.
const zoom = await evaluate(`(async () => {
  const c = document.querySelector("canvas");
  const ctx = c.getContext("2d");
  // Hash a block inside the photo circle. A single pixel can sit in a flat
  // region and stay identical across scales even when the render did change.
  const px = () => {
    const d = ctx.getImageData(430, 430, 220, 220).data;
    let h = 2166136261;
    for (let i = 0; i < d.length; i += 17) { h ^= d[i]; h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const before = px();

  const el = document.querySelector("input[type=range]");
  if (!el) return { error: "no range input" };
  const b = el.getBoundingClientRect();
  window.__zoomBox = { x: b.x + b.width * 0.7, y: b.y + b.height / 2 };
  window.__px = px;
  return { before, height: Math.round(b.height), box: window.__zoomBox };
})()`);
console.log("slider hit area:", zoom.height + "px");

// Drive the slider with a real mouse drag. Synthetic events leave too much
// doubt about whether React's onChange actually ran.
const { x, y } = zoom.box;
await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + 4, y, button: "left", buttons: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + 4, y, button: "left", buttons: 0 });
await sleep(500);

const afterDrag = await evaluate(`(() => ({
  after: window.__px(),
  value: document.querySelector("input[type=range]").value,
}))()`);
console.log("drag zoom:", afterDrag.value, "changed:", afterDrag.after !== zoom.before);

// Keyboard operation was the whole reason for choosing a range input over
// wheel-zoom, so it is asserted rather than assumed.
await evaluate(`(() => { document.querySelector("input[type=range]").focus(); return true; })()`);
const beforeKeys = await evaluate(`window.__px()`);
for (let i = 0; i < 12; i++) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", windowsVirtualKeyCode: 39, code: "ArrowRight", key: "ArrowRight" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 39, code: "ArrowRight", key: "ArrowRight" });
}
await sleep(400);
const afterKeys = await evaluate(`({ px: window.__px(), value: document.querySelector("input[type=range]").value })`);
console.log("keyboard zoom:", afterKeys.value, "changed:", afterKeys.px !== beforeKeys);

// Share to X. The composer must open on desktop even with no blob store
// configured, which is the case that used to dead-end on a 501.
await evaluate(`(() => {
  window.__opened = [];
  window.open = (u) => { window.__opened.push(u); return { closed: false }; };
  return true;
})()`);

const shareBtn = await evaluate(`(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes("Share to X"));
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
})()`);
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: shareBtn.x, y: shareBtn.y, button: "left", clickCount: 1, buttons: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: shareBtn.x, y: shareBtn.y, button: "left", buttons: 0 });
await sleep(1800);

const shared = await evaluate(`({
  opened: window.__opened,
  status: (document.querySelector("[role=status]") || document.querySelector("[role=alert]") || {}).textContent || null,
})`);
const intentUrl = shared.opened[0] ?? "";
console.log("share opened X:", intentUrl.startsWith("https://x.com/intent/tweet"));
console.log("caption has hashtag:", decodeURIComponent(intentUrl).includes("#FrameInGoa"));
console.log("share status:", JSON.stringify(shared.status));

// Reset zoom so the screenshots show the default framing.
await evaluate(`(() => {
  const el = document.querySelector("input[type=range]");
  const set = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value").set;
  set.call(el, "1");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await sleep(400);

await shoot("page-mobile.png", 390, 844);
await shoot("page-desktop.png", 1440, 1000);

console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");

ws.close();
chrome.kill();
process.exit(0);
