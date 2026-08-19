/**
 * WHERE IS THE PAGE EMPTY, AND BY HOW MUCH?
 *
 * Walks the built homepage in a real browser and reports every vertical band
 * taller than a threshold that contains no visible content box — the "dead
 * viewports" that three independent design passes kept reporting and that no
 * amount of reading the CSS could locate, because the gaps are emergent:
 * a section's bottom padding plus the next one's top padding plus a short
 * column plus a reveal offset, none of which is wrong on its own.
 *
 * It measures CONTENT, not sections. A band is dead if no text node, image,
 * canvas, border or rule renders inside it. Decorative fixed chrome (the plumb
 * line, the navigation) is excluded deliberately: a rail running through an
 * otherwise empty 400px is exactly the situation this is meant to find, and
 * counting the rail as content would hide it.
 *
 * Usage: npm run check:voids [page] [width]
 * Reports, and exits non-zero only when asked to with STRICT=1 — this is a
 * measuring tape first and a gate second, because "how much emptiness is too
 * much" is a design judgement that depends on the section.
 */
import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const NAME = process.argv[2] || "home";
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = WIDTH < 700 ? 844 : 900;
/** Bands taller than this are worth a designer's attention. */
const THRESHOLD = 260;

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".ico": "image/x-icon" };

if (!existsSync(out)) {
  console.error("  out/ missing. Build first: GITHUB_PAGES=true npm run build");
  process.exit(1);
}

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
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
const route = NAME === "home" ? "/" : `/${NAME}/`;
await page.goto(`http://127.0.0.1:${port}/pw${route}`, { waitUntil: "load" });
await page.waitForTimeout(6000);

/*
  Scroll the whole page first. Reveal animations start content at opacity 0,
  so measuring without scrolling would report the entire page as dead — the
  same class of mistake that made an early screenshot probe produce a
  convincing all-black "regression". Wheel steps, because Lenis owns scrolling.
*/
for (let i = 0; i < 300; i += 1) {
  const atEnd = await page.evaluate(
    () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4,
  );
  if (atEnd) break;
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);

const report = await page.evaluate((thresholdPx) => {
  const doc = document.documentElement;
  const total = doc.scrollHeight;
  /** 1px per row; true = something visible renders on this row. */
  const filled = new Uint8Array(total + 1);

  const EXCLUDE = new Set(["HTML", "BODY", "MAIN", "SCRIPT", "STYLE", "NOSCRIPT"]);

  for (const el of document.querySelectorAll("*")) {
    if (EXCLUDE.has(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (Number(cs.opacity) < 0.06) continue;
    // Fixed chrome is not content for this purpose — see the header note.
    if (cs.position === "fixed") continue;

    const paints =
      el.childNodes.length > 0 &&
      Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    /*
      SCENE HOSTS COUNT EVEN WHEN THEIR CANVAS IS NOT MOUNTED.

      SceneShell unmounts a canvas once its section is far off-screen, and this
      probe scrolls the whole page (to fire reveals) before measuring from the
      top — so by measurement time every distant canvas is gone and its section
      reads as a void. The first run of this script duly reported a 350px dead
      band in the finale, which is precisely where the balance scale stands.
      An instrument that invents the defect it was built to find is worse than
      no instrument.

      The HOST is what matters: it occupies that space whether the renderer is
      currently attached or the poster is showing.
    */
    const isMedia =
      ["IMG", "CANVAS", "SVG", "VIDEO", "PICTURE"].includes(el.tagName) ||
      el.classList.contains("section-scene") ||
      el.hasAttribute("data-webgl-surface");
    const hasEdge =
      cs.borderTopWidth !== "0px" || cs.borderBottomWidth !== "0px" ||
      (cs.backgroundImage !== "none" && el.clientHeight < 8);

    if (!paints && !isMedia && !hasEdge) continue;

    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) continue;
    const top = Math.max(0, Math.round(r.top + window.scrollY));
    const bottom = Math.min(total, Math.round(r.bottom + window.scrollY));
    // A tall wrapper is not "content" across its whole height; only mark the
    // rows a leaf actually paints on.
    if (bottom - top > 900 && !isMedia) continue;
    for (let y = top; y < bottom; y += 1) filled[y] = 1;
  }

  const voids = [];
  let start = null;
  for (let y = 0; y <= total; y += 1) {
    if (!filled[y]) {
      if (start === null) start = y;
    } else if (start !== null) {
      if (y - start >= thresholdPx) voids.push({ start, end: y, height: y - start });
      start = null;
    }
  }
  if (start !== null && total - start >= thresholdPx) {
    voids.push({ start, end: total, height: total - start });
  }

  // Name each void by the section it falls in.
  const sections = Array.from(document.querySelectorAll("section[id], section[data-scroll-section]"))
    .map((s) => {
      const r = s.getBoundingClientRect();
      return {
        id: s.id || s.dataset.scrollSection || "(unnamed)",
        top: Math.round(r.top + window.scrollY),
        bottom: Math.round(r.bottom + window.scrollY),
      };
    });

  for (const v of voids) {
    const mid = (v.start + v.end) / 2;
    const host = sections.find((s) => mid >= s.top && mid < s.bottom);
    v.section = host ? host.id : "(between sections)";
  }

  return { total, voids };
}, THRESHOLD);

console.log(`  ${NAME} at ${WIDTH}px — document ${report.total}px`);
if (!report.voids.length) {
  console.log(`  no empty band taller than ${THRESHOLD}px`);
} else {
  const worst = [...report.voids].sort((a, b) => b.height - a.height);
  console.log(`  ${report.voids.length} empty band(s) over ${THRESHOLD}px, worst first:\n`);
  for (const v of worst) {
    console.log(`    ${String(v.height).padStart(4)}px   y ${v.start}-${v.end}   in #${v.section}`);
  }
  const sum = report.voids.reduce((a, v) => a + v.height, 0);
  console.log(`\n  ${sum}px of the ${report.total}px document is empty band (${Math.round((sum / report.total) * 100)}%)`);
}

await browser.close();
server.close();
if (process.env.STRICT === "1" && report.voids.some((v) => v.height > 420)) process.exit(1);
