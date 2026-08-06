/**
 * DOES A DATA-SAVING VISITOR ACTUALLY AVOID DOWNLOADING THE 3D?
 *
 * capability.ts has always intended this. Its own comment, at the branch that
 * sets tier "none" for saveData and slow connections, says: "Respect an explicit
 * data-saving signal by not downloading/compiling the full scene."
 *
 * For a long time it did not do that, and nothing noticed, because every check
 * of the intent was a reading of the source rather than a measurement of the
 * bytes. The capability probe ran inside SceneShell — on the far side of the
 * `next/dynamic` boundary — so a phone advertising 2g with Data Saver switched
 * on had to fetch the whole renderer in order to discover it should not render
 * anything. Measured before the fix: 1527KB on a capable desktop and 1527KB on
 * 2g + saveData, byte for byte identical, with no canvas on the second.
 *
 * The fix moved the decision in front of the dynamic import (lib/scene-gate).
 * This gate exists because that fix is one careless import away from silently
 * reverting: any call site that renders a canvas without consulting the gate,
 * or any poster that drifts back into a module importing three.js, restores the
 * old behaviour with no visible symptom. Nothing on screen changes. Only the
 * bill changes, for the visitors who least wanted to pay it.
 *
 * WHY THIS IS A LOCAL GATE AND NOT PART OF CI.
 *
 * It needs a real GPU to mean anything. On a CI runner Chrome falls back to
 * SwiftShader, capability.ts correctly classifies that as tier "none", and the
 * capable profile stops rendering too — at which point both profiles download
 * the same small payload and the gate passes while proving nothing. A test that
 * cannot fail is worse than no test, so this refuses to report on a software
 * rasteriser rather than issuing a meaningless pass.
 *
 * Usage:  npm run check:3d-payload   (after a build)
 */

import { chromium } from "playwright-core";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

/*
  The renderer is around 600KB raw across three.js, R3F and drei. The floor is
  set well below that so ordinary chunk-splitting churn cannot trip it, while
  still being far above any plausible difference between two profiles of the
  same page. If savings ever land between 0 and this number, something has
  half-broken and that deserves a failure, not a shrug.
*/
const MIN_SAVED_BYTES = 300_000;

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".mp4": "video/mp4", ".ico": "image/x-icon",
};

if (!existsSync(join(out, "index.html"))) {
  console.error("\n  GATE ABORTED — no build in out/. Run `npm run build` first.\n");
  process.exit(1);
}

/*
  Serve with and without the /pw prefix. The Pages build carries basePath /pw;
  some local gates need a build without it. Accepting both means this gate never
  reports a misleading result just because of how the site happened to be built —
  the failure mode that made the contrast gate abort until it was taught to
  detect it.
*/
let jsBytes = 0;
let missing = 0;
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.startsWith("/pw/")) p = p.slice(3);
  let file = join(out, p);
  try { if (statSync(file).isDirectory()) file = join(file, "index.html"); }
  catch { missing += 1; res.writeHead(404).end(); return; }
  try {
    const body = readFileSync(file);
    if (extname(file) === ".js") jsBytes += body.length;
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { missing += 1; res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/pw/`;

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      const e = join(cache, d, "chrome-win64", "chrome.exe");
      if (existsSync(e)) return e;
    }
  }
  return null;
}

const chromePath = findChrome();
if (!chromePath) {
  console.error("\n  GATE ABORTED — no Chrome found. Set CHROME_PATH.\n");
  server.close();
  process.exit(1);
}

/*
  CDP network throttling does NOT move the Network Information API. Emulating a
  slow link with Network.emulateNetworkConditions leaves navigator.connection
  reporting 4g with saveData false, so capability.ts sees a fast connection and
  the profile tests nothing. This cost an afternoon once. The signal the code
  actually reads has to be set directly, before any page script runs.
*/
async function profile(browser, { dataSaver }) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (dataSaver) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        get: () => ({ saveData: true, effectiveType: "2g", rtt: 1400, downlink: 0.2 }),
      });
    });
  }

  jsBytes = 0;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(6500);
  // Scroll the page so every lazily-mounted scene has had its chance to load.
  for (const n of [1, 2, 3, 4, 5]) {
    await page.evaluate((y) => window.scrollTo(0, y * window.innerHeight), n);
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(1500);

  const canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
  const renderer = await page.evaluate(() => {
    try {
      const gl = document.createElement("canvas").getContext("webgl2")
        || document.createElement("canvas").getContext("webgl");
      if (!gl) return "";
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "unknown";
    } catch { return ""; }
  });

  await ctx.close();
  return { js: jsBytes, canvases, renderer };
}

const browser = await chromium.launch({ executablePath: chromePath });
const capable = await profile(browser, { dataSaver: false });
const saver = await profile(browser, { dataSaver: true });
await browser.close();
server.close();

const kb = (n) => `${Math.round(n / 1024)}kB`;

if (missing > 0) {
  console.error(
    `\n  GATE ABORTED — ${missing} asset(s) 404ed, so the byte counts are not the page's.\n`,
  );
  process.exit(1);
}

// Instrument guard: if the "capable" profile never rendered, there is no 3D to
// avoid and a pass would be vacuous. Say so instead of claiming a result.
if (capable.canvases === 0) {
  const software = /swiftshader|llvmpipe|software|basic render/i.test(capable.renderer);
  console.error(
    `\n  GATE ABORTED — the capable profile rendered no canvas, so this run\n` +
    `  cannot tell a working gate from a broken one.\n` +
    `  WebGL renderer reported: ${capable.renderer || "(none)"}\n` +
    (software
      ? `  That is a software rasteriser, which capability.ts correctly rates\n` +
        `  tier "none". Run this gate on a machine with a real GPU.\n`
      : `  Expected at least one canvas on a capable device.\n`),
  );
  process.exit(1);
}

const saved = capable.js - saver.js;
console.log(`\n  WebGL renderer: ${capable.renderer}`);
console.log(`\n  profile              canvas   JS downloaded`);
console.log(`  capable desktop      ${String(capable.canvases).padStart(6)}   ${kb(capable.js)}`);
console.log(`  2g + Data Saver      ${String(saver.canvases).padStart(6)}   ${kb(saver.js)}`);
console.log(`  ${"".padEnd(20)}           saved ${kb(saved)}\n`);

const problems = [];
if (saver.canvases !== 0) {
  problems.push(
    `a Data Saver visitor mounted ${saver.canvases} canvas(es). capability.ts rates ` +
    `this device tier "none", so nothing should render.`,
  );
}
if (saved < MIN_SAVED_BYTES) {
  problems.push(
    `only ${kb(saved)} of JS was avoided (floor ${kb(MIN_SAVED_BYTES)}). The renderer is ` +
    `still being downloaded by a visitor who will never see it — check that every ` +
    `next/dynamic canvas call site consults useSceneGate() before rendering, and that ` +
    `no poster has drifted into a module that imports three.js.`,
  );
}

if (problems.length) {
  console.error("  3D PAYLOAD GATE FAILED\n");
  for (const p of problems) console.error(`   - ${p}\n`);
  process.exit(1);
}

console.log(
  `  3D PAYLOAD GATE PASSED — a data-saving visitor avoids ${kb(saved)} of renderer\n` +
  `  and mounts no canvas, while the capable profile is untouched.\n`,
);
