/**
 * ACCESSIBILITY GATE FOR THE KEEPER'S INTERIOR.
 *
 * The general a11y gate can only reach the Keeper's sign-in screen, because
 * everything past it needs a GitHub token. That left the entire admin panel —
 * nine sections, thirty form controls, every validation message — outside the
 * reach of any instrument, which is exactly where regressions live quietly.
 *
 * So this one signs in against a STUBBED GitHub API. No token, no network, no
 * repository: the fetches are intercepted and answered with the smallest
 * responses that let the panel mount. Then it runs axe over the real panel and
 * asserts the behaviours axe cannot express — that the section strip is
 * keyboard-navigable, that moving through it is announced, and that a count
 * shown as a badge says what it counts.
 *
 * The stub is deliberately minimal. It is not a mock of GitHub; it is the
 * least fiction required to get the panel on screen.
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

if (!existsSync(join(out, "keeper", "index.html"))) {
  console.error("  keeper a11y: no built keeper page — run the export first");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".mp4": "video/mp4", ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (!p.startsWith("/pw/")) { res.writeHead(404).end(); return; }
  let file = join(out, p.slice(4));
  try { if (statSync(file).isDirectory()) file = join(file, "index.html"); }
  catch { res.writeHead(404).end(); return; }
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

/* Same search order as the sitewide gate, and the same rule: if no browser is
   found, say where we looked rather than leaving a CI log to be guessed at. */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
].filter(Boolean);

function findChrome() {
  for (const c of CHROME_CANDIDATES) if (existsSync(c)) return c;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      for (const sub of ["chrome-win64", "chrome-win"]) {
        const e = join(cache, d, sub, "chrome.exe");
        if (existsSync(e)) return e;
      }
    }
  }
  return null;
}

const chromePath = findChrome();
if (!chromePath) {
  console.error("  keeper a11y: no Chrome or Edge found. Looked in:");
  for (const c of CHROME_CANDIDATES) console.error("    " + c);
  process.exit(1);
}

const CONTENT_FILES = [
  "business", "services", "testimonials", "faq", "copy", "seo",
].map((n) => `src/content/${n}.json`);

const browser = await chromium.launch({ executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.route("https://api.github.com/**", (route) => {
  const url = route.request().url();
  const json = (body) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

  if (url.endsWith("/user")) return json({ login: "gate" });
  if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return json({ permissions: { push: true } });
  if (url.includes("/git/ref/heads/")) return json({ object: { sha: "0".repeat(40) } });
  if (url.includes("/contents/")) {
    const m = url.match(/contents\/([^?]+)/);
    const path = m ? decodeURIComponent(m[1]) : "";
    // Empty documents: the editors render every field, which is what we want
    // to audit, and the validators simply report everything as unconfirmed.
    if (CONTENT_FILES.includes(path)) {
      return json({ content: Buffer.from("{}", "utf8").toString("base64"), encoding: "base64" });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  }
  if (url.includes("/actions/runs")) return json({ workflow_runs: [] });
  if (url.includes("/git/trees")) return json({ tree: [] });
  return json({});
});

const failures = [];

await page.goto(`http://127.0.0.1:${port}/pw/keeper/`, { waitUntil: "load" });
await page.waitForTimeout(400);
/*
  TWO DOORS SINCE SUPABASE AUTH ARRIVED. A build with NEXT_PUBLIC_SUPABASE_*
  set shows the email form first, with "Use an access key instead" switching
  to the token form this gate drives (the GitHub API is stubbed above;
  Supabase is not, and stubbing an auth service would test the stub). A build
  without those variables shows the token form directly. Handle both, so the
  gate passes regardless of which flavour of out/ it is pointed at.

  This block exists because the first run after the email door landed spent
  its whole timeout waiting for #keeper-token on a page that was correctly
  showing #keeper-email — the gate was wrong, not the page.
*/
const emailDoor = await page.$("#keeper-email");
if (emailDoor) {
  await page.click("text=Use an access key instead");
  await page.waitForSelector("#keeper-token", { timeout: 5000 });
}
await page.fill("#keeper-token", "github_pat_gate");
await page.click("button[type=submit]");
await page.waitForTimeout(2500);

const mounted = await page.evaluate(() => !!document.getElementById("keeper-panel"));
if (!mounted) {
  failures.push("the panel never mounted behind the stub — the rest of this gate could not run");
} else {
  /* ---- structure the panel must have ---- */
  const s = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panel = document.getElementById("keeper-panel");
    return {
      h1: document.querySelectorAll("h1").length,
      tabs: tabs.length,
      selected: tabs.filter((t) => t.getAttribute("aria-selected") === "true").length,
      focusable: tabs.filter((t) => t.tabIndex === 0).length,
      live: document.querySelectorAll('[aria-live="polite"]').length,
      skip: !!document.querySelector('a[href="#keeper-panel"]'),
      panelRole: panel.getAttribute("role"),
      strips: document.querySelectorAll('[role="tablist"]').length,
    };
  });
  if (s.h1 !== 1) failures.push(`expected exactly one <h1>, found ${s.h1}`);
  if (s.tabs === 0) failures.push("no tabs — the section strip lost its roles");
  if (s.live !== 1) failures.push(`expected one polite live region, found ${s.live}`);
  if (!s.skip) failures.push("the skip link is gone");
  if (s.panelRole !== "tabpanel") failures.push(`panel role is ${s.panelRole}, expected tabpanel`);
  // One selected and one focusable tab PER strip: roving tabindex.
  if (s.selected !== s.strips) failures.push(`${s.selected} selected tabs across ${s.strips} strips`);
  if (s.focusable !== s.strips) failures.push(`${s.focusable} focusable tabs across ${s.strips} strips`);

  /* ---- the strip must be drivable by keyboard, and say so ---- */
  await page.focus('[role="tab"][aria-selected="true"]');
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    announced: document.querySelector('[aria-live="polite"]')?.textContent?.trim() ?? "",
    label: document.getElementById("keeper-panel")?.getAttribute("aria-label") ?? "",
    focusIsTab: document.activeElement?.getAttribute("role") === "tab",
  }));
  if (!after.announced) failures.push("moving through the sections announced nothing");
  if (!after.label) failures.push("the panel lost its accessible name after switching section");
  if (!after.focusIsTab) failures.push("arrow keys moved selection but not focus");

  /* ---- a count shown as a badge has to say what it counts ---- */
  const bare = await page.getByRole("tab", { name: /\s\d+\s*$/ }).count();
  if (bare > 0) failures.push(`${bare} tab(s) end in a bare number with no noun`);

  /* ---- and then axe over the whole authenticated panel ---- */
  const axeSource = readFileSync(join(root, "node_modules", "axe-core", "axe.min.js"), "utf8");
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () =>
    await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    }),
  );
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  console.log(`  panel mounted — axe: ${blocking.length} blocking, ` +
    `${results.violations.length - blocking.length} note(s)`);
  for (const v of results.violations) {
    if (v.impact === "serious" || v.impact === "critical") {
      failures.push(`[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`);
      for (const n of v.nodes.slice(0, 2)) failures.push(`      ${n.target.join(" ")}`);
    } else {
      console.log(`       note: [${v.impact}] ${v.id} — ${v.help}`);
    }
  }
}

await browser.close();
server.close();

if (failures.length > 0) {
  console.error(`\nKEEPER A11Y CHECK FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log("  keeper a11y: panel structure, keyboard strip and announcements all intact");
