/**
 * SEE THE PERSISTENT WORLD.
 *
 * The world in src/components/webgl/world is not mounted in the site layout —
 * it is finished architecturally and unfinished visually, so it is deliberately
 * one import away from live rather than live and half-done. That makes it
 * invisible, and invisible is how the gold mass shipped three separate
 * rendering defects without anyone noticing: noise quantised into flat plates,
 * displacement too small to alter the silhouette, and a chamfer that collapsed
 * the bottom cap into zero-area triangles.
 *
 * So this mounts it temporarily, builds, walks the chapter timeline and writes
 * a frame per chapter to .shots/. layout.tsx is ALWAYS restored, including on
 * failure — the same finally-block discipline measure-opening-tempo.mjs uses
 * for Loader.tsx, and for the same reason: a script that edits source must not
 * be able to leave the tree modified.
 *
 * Usage:  node scripts/shot-world.mjs [label]
 */

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT = join(root, "src", "app", "(site)", "layout.tsx");
const out = join(root, "out");
const shots = join(root, ".shots");
mkdirSync(shots, { recursive: true });

const label = process.argv[2] || "world";

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".ico": "image/x-icon" };

function findChrome() {
  for (const x of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"].filter(Boolean)) {
    if (existsSync(x)) return x;
  }
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      for (const sub of ["chrome-win64", "chrome-win", "chrome-linux"]) {
        const e = join(cache, d, sub, process.platform === "win32" ? "chrome.exe" : "chrome");
        if (existsSync(e)) return e;
      }
    }
  }
  return null;
}

const original = readFileSync(LAYOUT, "utf8");

try {
  // Mount the world in place of the shipped backdrop, for this build only.
  const patched = original
    .replace(
      "import { FireflyBackdrop } from '@/components/ui/FireflyBackdrop';",
      "import { GoldWorld } from '@/components/ui/GoldWorld';",
    )
    .replace("<FireflyBackdrop />", "<GoldWorld />");

  if (patched === original) {
    console.error("  could not mount the world — layout.tsx no longer matches.");
    console.error("  Expected an import of FireflyBackdrop and a <FireflyBackdrop /> element.");
    process.exit(1);
  }
  writeFileSync(LAYOUT, patched);

  process.stdout.write("  building… ");
  execFileSync("npx", ["next", "build"], {
    cwd: root, stdio: "ignore", shell: true,
    env: { ...process.env, GITHUB_PAGES: "true", BASE_PATH: "",
      NEXT_PUBLIC_SITE_URL: "https://pureweightofficial.github.io/pw",
      NEXT_PUBLIC_ALLOW_INDEXING: "false" },
  });
  console.log("done");

  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.startsWith("/pw/")) p = p.slice(3);
    let f = join(out, p);
    try { if (statSync(f).isDirectory()) f = join(f, "index.html"); }
    catch { res.writeHead(404).end(); return; }
    try {
      res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
      res.end(readFileSync(f));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("  no Chrome found. Set CHROME_PATH.");
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/pw/`, { waitUntil: "load" });
  await page.waitForTimeout(8000);

  const canvases = await page.evaluate(() => document.querySelectorAll("canvas").length);
  console.log(`  canvases on the page: ${canvases}`);
  if (canvases === 0) {
    console.error("  NO CANVAS MOUNTED — the frames below would show an empty page.");
    console.error("  Nothing can be judged from this run.");
    process.exitCode = 1;
  }

  const travel = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight);

  for (const [name, frac] of [["hero", 0.02], ["weight", 0.22], ["purity", 0.37],
    ["market", 0.53], ["value", 0.68], ["close", 0.96]]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(travel * frac));
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(shots, `${label}-${name}.png`) });
  }
  console.log(`  6 chapter frames written to .shots/${label}-*.png`);

  await browser.close();
  server.close();
} finally {
  writeFileSync(LAYOUT, original);
  console.log("  layout.tsx restored.");
}
