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
 * It asserts nothing — it is a window, not a gate. check-keeper-a11y.mjs is the
 * gate, and it drives the same sign-in.
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

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

// Serve the REAL content files so the panel shows real rows, not an empty shell.
const readContent = (name) => {
  try { return readFileSync(join(root, "src", "content", `${name}.json`), "utf8"); }
  catch { return "{}"; }
};

await page.route("https://api.github.com/**", (route) => {
  const url = route.request().url();
  const json = (b) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
  if (url.endsWith("/user")) return json({ login: "pureweightofficial" });
  if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return json({ permissions: { push: true } });
  if (url.includes("/git/ref/heads/")) return json({ object: { sha: "0".repeat(40) } });
  if (url.includes("/actions/runs")) return json({ workflow_runs: [
    { head_sha: "0be8408", status: "completed", conclusion: "success",
      created_at: "2026-08-06T09:37:25Z", html_url: "#" },
  ] });
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

await page.goto(`http://127.0.0.1:${port}/pw/keeper/`, { waitUntil: "load" });
await page.waitForTimeout(600);
await page.screenshot({ path: join(shots, "keeper-signin.png") });

await page.fill("#keeper-token", "github_pat_shot");
await page.click("button[type=submit]");
await page.waitForTimeout(3000);

await page.screenshot({ path: join(shots, "keeper-dashboard.png") });

/*
  Every section, by its tab's id rather than its visible label. Matching on text
  quietly captured nothing for "services", whose tab reads "What We Buy" — the
  loop reported a miss and carried on, which is exactly how a screen goes
  unexamined. The ids are the component's own keys and cannot drift from it.
*/
const keys = await page.evaluate(() =>
  [...document.querySelectorAll('[id^="keeper-tab-"]')]
    .map((t) => t.id.replace("keeper-tab-", ""))
    .filter((k) => !k.startsWith("m-")));

let captured = 0;
for (const key of keys) {
  const tab = page.locator(`#keeper-tab-${key}`);
  if (!(await tab.count())) {
    console.log(`  MISSING: no tab #keeper-tab-${key}`);
    continue;
  }
  await tab.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(shots, `keeper-${key}.png`) });
  captured += 1;
}

console.log(`  ${captured} of ${keys.length} sections captured → .shots/`);
if (captured !== keys.length) process.exitCode = 1;

await browser.close();
server.close();
