/**
 * LOOK AT THE BUILT SITE, LOCALLY.
 *
 * Serves out/ and screenshots pages at 1440px. This exact loop — serve the
 * build, open it, look — has now been rebuilt from scratch four times in this
 * project's history as a "temporary" probe, which is the definition of a
 * permanent tool. The design overhaul runs on it: every visual phase is
 * accepted by looking at frames, not by reading diffs.
 *
 * Usage: npm run shot:local [path ...]   (default: / and /faq)
 * Frames land in .shots/local-<name>.png
 */
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/faq"];
for (const p of paths) {
  const name = p === "/" ? "home" : p.replace(/\//g, "-").replace(/^-|-$/g, "");
  await page.goto(`http://127.0.0.1:${port}/pw${p.endsWith("/") ? p : p + "/"}`.replace(/\/\/$/, "/"), { waitUntil: "load" });
  await page.waitForTimeout(p === "/" ? 7000 : 4000);
  await page.screenshot({ path: join(shots, `local-${name}-top.png`) });
  const travel = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  if (travel > 400) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(travel * 0.4));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(shots, `local-${name}-mid.png`) });
  }
  console.log(`  ${p} captured`);
}
await browser.close();
server.close();
