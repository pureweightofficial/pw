/**
 * WHAT THE OPENING COSTS, PER TEMPO.
 *
 * OPENING_TEMPO in src/components/chrome/Loader.tsx is the one number trading
 * brand time against Largest Contentful Paint. Its own comment says as much,
 * and until now the trade had no price attached: raising it obviously helps
 * LCP, but by how much, and is the curve worth the beat it costs?
 *
 * This builds the site at several tempi and measures LCP for each, on a
 * throttled mobile profile, with a cold session so the curtain actually plays.
 * The output is a small table, so choosing a tempo becomes a decision about a
 * known cost rather than a guess.
 *
 * It does NOT choose. Which beat the opening should keep is an art-direction
 * call; this only prices the options.
 *
 * Usage:  node scripts/measure-opening-tempo.mjs [tempo ...]
 */

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOADER = join(root, "src", "components", "chrome", "Loader.tsx");
const AUTHORED_MS = 2250; // OPENING_AUTHORED_MS — the timeline at tempo 1.0

const tempi = process.argv.slice(2).map(Number).filter((n) => n > 0);
const TEMPI = tempi.length ? tempi : [1.0, 1.45, 2.0, 2.6];
const RUNS = 3;

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2",
  ".mp4": "video/mp4", ".ico": "image/x-icon",
};

function serve(dir) {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (!p.startsWith("/pw/")) { res.writeHead(404).end(); return; }
    let file = join(dir, p.slice(4));
    try { if (statSync(file).isDirectory()) file = join(file, "index.html"); }
    catch { res.writeHead(404).end(); return; }
    try {
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, port: server.address().port })));
}

function findChrome() {
  const c = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  for (const x of c) if (existsSync(x)) return x;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      const e = join(cache, d, "chrome-win64", "chrome.exe");
      if (existsSync(e)) return e;
    }
  }
  return null;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/*
  TWO NUMBERS, BECAUSE ONE OF THEM IS TOO NOISY TO DECIDE ON.

  The first version of this reported LCP alone. Three runs at a single tempo
  came back 8540, 4492 and 3264ms — a 2.6x spread on one build. The difference
  between the tempi being compared is around 700ms per step, so the noise was
  several times the signal, and a tidy table of medians would have been false
  precision dressed as evidence.

  So the headline number is now when the curtain LIFTS, which is what the tempo
  actually controls and what LCP is downstream of. It is measured by watching
  for the opening's own element to leave the DOM, and it varies far less
  because it is not competing with paint scheduling.

  LCP is still reported, with its full spread rather than a median alone, so
  the noise is visible instead of hidden.
*/
async function measureOpening(browser, url) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__curtainGone = null;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    // The opening's neon word is unique to the curtain; when it leaves the
    // document the curtain has finished and the page is the page.
    const seen = () => !!document.querySelector(".pw-neon-left");
    const tick = () => {
      if (window.__curtainGone === null && !seen() && window.__everSeen) {
        window.__curtainGone = Math.round(performance.now());
        return;
      }
      if (seen()) window.__everSeen = true;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(12000);
  const r = await page.evaluate(() => ({ lcp: window.__lcp, curtain: window.__curtainGone }));
  await ctx.close();
  return r;
}

/** Kept for reference; superseded by measureOpening above. */
async function measureLcpOnly(browser, url) {
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(11000);
  const lcp = await page.evaluate(() => window.__lcp);
  await ctx.close();
  return lcp;
}

const original = readFileSync(LOADER, "utf8");
const chromePath = findChrome();
if (!chromePath) { console.error("  no Chrome found"); process.exit(1); }

const rows = [];
try {
  for (const tempo of TEMPI) {
    const patched = original.replace(
      /const OPENING_TEMPO = [\d.]+;/,
      `const OPENING_TEMPO = ${tempo};`,
    );
    if (patched === original && !original.includes(`const OPENING_TEMPO = ${tempo};`)) {
      console.error("  could not patch OPENING_TEMPO — the constant moved");
      process.exit(1);
    }
    writeFileSync(LOADER, patched);

    process.stdout.write(`  tempo ${tempo.toFixed(2)} — building… `);
    execFileSync("npx", ["next", "build"], {
      cwd: root, stdio: "ignore", shell: true,
      env: { ...process.env, GITHUB_PAGES: "true",
        NEXT_PUBLIC_SITE_URL: "https://pureweightofficial.github.io/pw",
        NEXT_PUBLIC_ALLOW_INDEXING: "false" },
    });

    const { server, port } = await serve(join(root, "out"));
    const browser = await chromium.launch({ executablePath: chromePath });
    const lcps = [];
    const curtains = [];
    for (let i = 0; i < RUNS; i++) {
      const r = await measureOpening(browser, `http://127.0.0.1:${port}/pw/`);
      lcps.push(r.lcp);
      if (r.curtain) curtains.push(r.curtain);
    }
    await browser.close();
    server.close();

    rows.push({
      tempo,
      authored: Math.round(AUTHORED_MS / tempo),
      curtain: curtains.length ? median(curtains) : null,
      curtainRuns: curtains,
      lcp: median(lcps),
      lcpLow: Math.min(...lcps),
      lcpHigh: Math.max(...lcps),
    });
    const last = rows[rows.length - 1];
    console.log(
      `authored ${last.authored}ms  curtain lifts ${last.curtain ?? "?"}ms  ` +
      `LCP ${last.lcp}ms (${last.lcpLow}-${last.lcpHigh})`,
    );
  }
} finally {
  writeFileSync(LOADER, original);
  console.log("\n  Loader.tsx restored to its committed tempo.");
}

const current = rows.find((r) => Math.abs(r.tempo - 1.45) < 0.001);
console.log("\n  tempo  authored  curtain lifts   vs current   LCP (spread)");
for (const r of rows) {
  const delta = current && current.curtain && r.curtain ? r.curtain - current.curtain : null;
  const mark = current && Math.abs(r.tempo - current.tempo) < 0.001 ? "  <- current" : "";
  console.log(
    `  ${r.tempo.toFixed(2).padStart(5)}  ${String(r.authored).padStart(6)}ms  ` +
    `${String(r.curtain ?? "?").padStart(11)}ms  ` +
    `${(delta === null ? "" : (delta > 0 ? "+" : "") + delta + "ms").padStart(10)}   ` +
    `${r.lcp}ms (${r.lcpLow}-${r.lcpHigh})${mark}`,
  );
}
console.log(
  "\n  'curtain lifts' is the number the tempo controls, and the one to decide on.\n" +
  "  LCP is shown with its full spread because it is noisy enough on one machine\n" +
  "  that a single median would overstate what was measured. Lab figures, throttled\n" +
  "  mobile profile — directional, not a promise about real visitors.",
);
