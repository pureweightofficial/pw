/**
 * FULL-PAGE DESIGN SWEEP.
 *
 * shot-local.mjs answers "is the page broken?" with two frames. Design review
 * needs the WHOLE scroll: every section, mid-reveal states, scene moments.
 * This captures a frame roughly every 85% of a viewport down the entire page,
 * wheel-scrolled (Lenis owns scrolling — see shot-local.mjs for the artefact
 * that rule prevents), pausing long enough at each stop for reveals to land.
 *
 * Usage: npm run shot:sweep [page]      (default: home)
 * Frames land in .shots/sweep-<name>-NN.png
 */
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

/*
  THE STALENESS GUARD, and it exists because its absence cost a whole
  diagnosis cycle plus a round of "I fixed it" that fixed nothing.

  next.config.ts gates the static export on GITHUB_PAGES === 'true'. A build
  run as `GITHUB_PAGES=1` is therefore a NODE build: it succeeds, it prints a
  full route table, it never writes out/ — and this script then happily
  screenshots whatever out/ was left over from the last correct build. Three
  consecutive sweeps "showed no change" because they were photographs of the
  build from before the edits.

  So: refuse to shoot an out/ older than the newest source file. A probe that
  silently reports on stale bytes is worse than no probe, because its output
  looks exactly like a real negative result.
*/
function newestSourceMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) newest = Math.max(newest, newestSourceMtime(full));
    else newest = Math.max(newest, statSync(full).mtimeMs);
  }
  return newest;
}
if (!existsSync(out)) {
  console.error("out/ does not exist. Build first: GITHUB_PAGES=true npm run build");
  process.exit(1);
}
{
  const built = statSync(join(out, "index.html")).mtimeMs;
  const src = Math.max(
    newestSourceMtime(join(root, "src")),
    statSync(join(root, "next.config.ts")).mtimeMs,
  );
  if (src > built) {
    const age = Math.round((src - built) / 1000);
    console.error(
      `STALE BUILD: out/index.html is ${age}s older than the newest source file.
` +
      `These frames would show the PREVIOUS build, not your changes.
` +
      `Rebuild with:  GITHUB_PAGES=true npm run build   (note: 'true', not '1')`,
    );
    process.exit(1);
  }
}
const shots = join(root, ".shots");
mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.startsWith("/pw/")) p = p.slice(3);
  let f = join(out, p);
  try { if (statSync(f).isDirectory()) f = join(f, "index.html"); } catch { res.writeHead(404).end(); return; }
  try { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
function findChrome() {
  for (const x of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean))
    if (existsSync(x)) return x;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  for (const d of readdirSync(cache)) {
    const e = join(cache, d, "chrome-win64", "chrome.exe");
    if (existsSync(e)) return e;
  }
  return null;
}
const browser = await chromium.launch({ executablePath: findChrome() });
/*
  WIDTH IS AN ARGUMENT, because a design pass done only at 1440 is a design
  pass done for one reader. Several of this page's compositions are explicitly
  desktop-grid decisions (the specimen sits in a four-column gutter that does
  not exist below lg), so the narrow read has to be looked at, not assumed.
  Usage: npm run shot:sweep [page] [width]
*/
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = WIDTH < 700 ? 844 : 900;
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

const name = process.argv[2] || "home";
const tag = WIDTH === 1440 ? "" : `-${WIDTH}`;
const route = name === "home" ? "/" : `/${name}/`;
await page.goto(`http://127.0.0.1:${port}/pw${route}`, { waitUntil: "load" });
await page.waitForTimeout(name === "home" ? 7000 : 4000);

let frame = 0;
const pad = (n) => String(n).padStart(2, "0");
await page.screenshot({ path: join(shots, `sweep-${name}${tag}-${pad(frame++)}.png`) });

const step = Math.round(HEIGHT * 0.85);
for (;;) {
  const before = await page.evaluate(() => window.scrollY);
  let moved = 0;
  while (moved < step) {
    await page.mouse.wheel(0, 380);
    moved += 380;
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => window.scrollY);
  if (after - before < 40) break; // bottom reached (Lenis settled short)
  await page.screenshot({ path: join(shots, `sweep-${name}${tag}-${pad(frame++)}.png`) });
  if (frame > 40) break; // runaway guard
}
console.log(`${frame} frames -> .shots/sweep-${name}${tag}-*.png`);
await browser.close();
server.close();
