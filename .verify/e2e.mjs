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

const drew = await evaluate(`(() => {
  const c = document.querySelector("canvas");
  const ctx = c.getContext("2d");
  // Sample a pixel inside the photo window; if the photo drew, it is not the
  // flat empty-state indigo.
  const d = ctx.getImageData(540, 640, 1, 1).data;
  return { w: c.width, h: c.height, pixel: [d[0], d[1], d[2]] };
})()`);
console.log("canvas:", JSON.stringify(drew));

await shoot("page-mobile.png", 390, 844);
await shoot("page-desktop.png", 1440, 1000);

console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");

ws.close();
chrome.kill();
process.exit(0);
