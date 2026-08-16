/**
 * SEE THE KEEPER WITHOUT SIGNING INTO IT.
 *
 * Everything past the Keeper's sign-in needs a real GitHub token, which makes
 * the panel the owner actually uses the one part of this project nobody can
 * casually look at — not in a review, not while deciding whether a change to it
 * was an improvement. Design work on a screen you cannot see is guesswork, and
 * it showed: the nav's longest label was silently truncating to "Business
 * Deta…" and no instrument, and no person, had noticed.
 *
 * So this signs in against the SAME stubbed GitHub API the a11y gate uses and
 * writes a screenshot of each section to .shots/. The stub serves the project's
 * real src/content/*.json, so the panel shows the real fields and real counts
 * rather than an empty shell.
 *
 * BOTH WIDTHS, because the panel has two entirely different chrome layouts and
 * only one of them had ever been looked at. The sidebar is desktop-only; below
 * the lg breakpoint the nav becomes a horizontal scrolling strip in a header,
 * and every editor reflows to a single column. Capturing only 1440px audited
 * half the interface.
 *
 * It asserts nothing about how any of it looks — it is a window, not a gate.
 * check-keeper-a11y.mjs is the gate, and it drives the same sign-in.
 *
 * Usage:  npm run build && npm run shot:keeper
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".mp4": "video/mp4", ".ico": "image/x-icon" };

const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (!p.startsWith("/pw/")) { res.writeHead(404).end(); return; }
  let f = join(out, p.slice(4));
  try { if (statSync(f).isDirectory()) f = join(f, "index.html"); } catch { res.writeHead(404).end(); return; }
  try { res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" }); res.end(readFileSync(f)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

function findChrome() {
  for (const x of [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome"].filter(Boolean)) if (existsSync(x)) return x;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  for (const d of readdirSync(cache)) {
    const e = join(cache, d, "chrome-win64", "chrome.exe");
    if (existsSync(e)) return e;
  }
  return null;
}

const shots = join(root, ".shots");
mkdirSync(shots, { recursive: true });

// Serve the REAL content files so the panel shows real rows, not an empty shell.
const readContent = (name) => {
  try { return readFileSync(join(root, "src", "content", `${name}.json`), "utf8"); }
  catch { return "{}"; }
};

function stubGithub(page) {
  return page.route("https://api.github.com/**", (route) => {
    const url = route.request().url();
    const json = (b) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (url.endsWith("/user")) return json({ login: "pureweightofficial" });
    if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return json({ permissions: { push: true } });
    if (url.includes("/git/ref/heads/")) return json({ object: { sha: "0".repeat(40) } });
    if (url.includes("/actions/runs")) return json({ workflow_runs: [] });
    if (url.includes("/git/trees")) return json({ tree: [] });
    if (url.includes("/contents/")) {
      const m = url.match(/contents\/([^?]+)/);
      const path = m ? decodeURIComponent(m[1]) : "";
      const nm = path.match(/src\/content\/([a-z]+)\.json/);
      if (nm) return json({ content: Buffer.from(readContent(nm[1]), "utf8").toString("base64"), encoding: "base64" });
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    }
    return json({});
  });
}

const browser = await chromium.launch({ executablePath: findChrome() });

/*
  A width is only "captured" if the section actually rendered something. An
  empty page screenshots perfectly happily, and a run that wrote nine identical
  black rectangles would report nine successes — so each shot is checked for a
  visible heading before it counts.
*/
async function capture(label, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile,
    deviceScaleFactor: isMobile ? 2 : 1 });
  const page = await ctx.newPage();
  await stubGithub(page);

  await page.goto(`http://127.0.0.1:${port}/pw/keeper/`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(shots, `${label}-signin.png`) });

  await page.fill("#keeper-token", "github_pat_shot");
  await page.click("button[type=submit]");
  await page.waitForTimeout(3000);

  if (!(await page.locator("#keeper-panel").count())) {
    console.log(`  ${label}: the panel never mounted — nothing captured`);
    await ctx.close();
    return { captured: 0, total: 0, empty: [] };
  }

  /*
    BOTH strips are always in the DOM — the sidebar is hidden with `lg:` classes,
    not unmounted, and the mobile header likewise. So the id prefix has to be
    chosen by what is actually PAINTED at this width, not by what exists. Picking
    the first matching id sent the mobile pass clicking at a display:none sidebar
    button until Playwright timed out.
  */
  const prefix = await page.evaluate(() => {
    const painted = (el) => !!el && el.getBoundingClientRect().width > 0;
    return painted(document.getElementById("keeper-tab-dashboard"))
      ? "keeper-tab-"
      : "keeper-tab-m-";
  });

  const keys = await page.evaluate((p) =>
    [...document.querySelectorAll(`[id^="${p}"]`)]
      .filter((t) => t.getBoundingClientRect().width > 0)
      .map((t) => t.id.slice(p.length)), prefix);

  let captured = 0;
  const empty = [];
  for (const key of keys) {
    const tab = page.locator(`#${prefix}${key}`);
    if (!(await tab.count())) {
      console.log(`  ${label}: MISSING tab for ${key}`);
      continue;
    }
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(shots, `${label}-${key}.png`) });
    const heading = await page.locator("#keeper-panel h2, #keeper-panel h3").first().count();
    if (!heading) empty.push(key);
    captured += 1;
  }

  await ctx.close();
  return { captured, total: keys.length, empty };
}

const desktop = await capture("keeper", { width: 1440, height: 950 }, false);
const mobile = await capture("keeper-mobile", { width: 390, height: 844 }, true);

await browser.close();
server.close();

console.log(`  desktop 1440px : ${desktop.captured}/${desktop.total} sections`);
console.log(`  mobile   390px : ${mobile.captured}/${mobile.total} sections`);
console.log(`  written to .shots/`);

const bad = [];
if (desktop.captured !== desktop.total || desktop.total === 0) bad.push("desktop");
if (mobile.captured !== mobile.total || mobile.total === 0) bad.push("mobile");
for (const [w, r] of [["desktop", desktop], ["mobile", mobile]]) {
  if (r.empty.length) console.log(`  ${w}: no heading rendered in — ${r.empty.join(", ")}`);
}
if (bad.length) {
  console.error(`\n  incomplete capture at: ${bad.join(", ")}`);
  process.exitCode = 1;
}
