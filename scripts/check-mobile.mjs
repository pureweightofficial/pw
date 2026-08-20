/**
 * WHAT DOES THIS PAGE COST A REAL PHONE?
 *
 * check-perf.mjs answers "is scrolling smooth" — a frame-rate question, on an
 * unthrottled desktop. This answers the other one: what happens to somebody on
 * a mid-range Android on mobile data who has never visited before. Those are
 * different failures with different fixes, and this site had only ever
 * measured the first.
 *
 * CONDITIONS match Lighthouse's mobile defaults exactly, so the numbers here
 * can be compared with PageSpeed Insights instead of arguing with it:
 *
 *     1.6 Mbit/s down, 750 Kbit/s up, 150ms RTT   (Lighthouse "Slow 4G")
 *     4x CPU slowdown
 *     412x915 at DPR 2.625                        (Pixel-class viewport)
 *     cold cache, fresh profile
 *
 * WHAT IT REPORTS, and why each one is here rather than a generic list:
 *
 *   LCP + THE ELEMENT           "improve LCP" is useless without knowing what
 *                               the browser actually chose. This prints the
 *                               tag, its size and its URL.
 *   CLS + THE SHIFTING NODES    same reasoning: the sources, not the score.
 *   TBT and the LONG TASKS      total blocking time plus the worst offenders,
 *                               because on 4x CPU this is where a WebGL site
 *                               loses its interaction budget.
 *   BYTES BY TYPE               script/image/font/css/media separately, since
 *                               the fix for 900KB of JS is nothing like the
 *                               fix for 900KB of video.
 *   WHAT THE MAIN THREAD RAN    script evaluation time, the number nobody
 *                               looks at until INP is bad.
 *
 * Usage:  node scripts/check-mobile.mjs [url]
 *         default https://pureweight.gold/
 */
import { chromium } from "playwright-core";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const URL_ = process.argv[2] || "https://pureweight.gold/";

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
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
});
const page = await context.newPage();
const client = await context.newCDPSession(page);

await client.send("Network.enable");
await client.send("Network.clearBrowserCache");
await client.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

/* Byte accounting from the network layer, not from resource timing: the
   latter reports 0 for cross-origin responses without Timing-Allow-Origin. */
const bytes = {};
const requests = [];
client.on("Network.responseReceived", (e) => {
  requests.push({ url: e.response.url, type: e.type, status: e.response.status });
});
client.on("Network.loadingFinished", (e) => {
  const req = requests.find((r) => r.id === e.requestId);
  void req;
});
page.on("response", async (res) => {
  try {
    const h = res.headers();
    const len = Number(h["content-length"] || 0);
    const type = (res.request().resourceType() || "other").toLowerCase();
    bytes[type] = (bytes[type] || 0) + len;
  } catch {}
});

// Observers must exist before anything paints.
await page.addInitScript(() => {
  window.__m = { lcp: null, cls: 0, shifts: [], longTasks: [] };

  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__m.lcp = {
        time: e.startTime,
        url: e.url || null,
        size: e.size,
        tag: e.element ? e.element.tagName : null,
        cls: e.element ? (e.element.className || "").toString().slice(0, 90) : null,
      };
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });

  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue; // user-initiated shifts are not CLS
      window.__m.cls += e.value;
      for (const s of e.sources || []) {
        window.__m.shifts.push({
          value: Number(e.value.toFixed(4)),
          tag: s.node ? s.node.tagName : "?",
          cls: s.node ? (s.node.className || "").toString().slice(0, 70) : "",
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });

  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__m.longTasks.push(Math.round(e.duration));
    }
  }).observe({ type: "longtask", buffered: true });
});

const t0 = Date.now();
await page.goto(URL_, { waitUntil: "load", timeout: 120000 });
const loadMs = Date.now() - t0;
// Let late work (WebGL compile, deferred chunks) land before reading.
await page.waitForTimeout(9000);

const m = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0] || {};
  const paints = {};
  for (const p of performance.getEntriesByType("paint")) paints[p.name] = p.startTime;
  return {
    ...window.__m,
    ttfb: nav.responseStart,
    domContentLoaded: nav.domContentLoadedEventEnd,
    fcp: paints["first-contentful-paint"] || null,
    domNodes: document.getElementsByTagName("*").length,
    maxDepth: (function d(n, k = 0) {
      let best = k;
      for (const c of n.children) best = Math.max(best, d(c, k + 1));
      return best;
    })(document.body),
  };
});

const f = (n) => (n == null ? "n/a" : `${Math.round(n)}ms`);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

console.log(`\nMOBILE AUDIT — ${URL_}`);
console.log(`  Slow 4G (1.6Mbps / 150ms RTT), 4x CPU, 412x915 @2.625, cold cache\n`);

console.log(`  TTFB                 ${f(m.ttfb)}          target <= 500ms`);
console.log(`  FCP                  ${f(m.fcp)}`);
console.log(`  LCP                  ${f(m.lcp?.time)}          target <= 2000ms`);
if (m.lcp) {
  console.log(`     element           <${(m.lcp.tag || "?").toLowerCase()}> ${m.lcp.cls ? `class="${m.lcp.cls}"` : ""}`);
  console.log(`     resource          ${m.lcp.url || "(text node — no resource)"}`);
}
console.log(`  CLS                  ${m.cls.toFixed(4)}           target <= 0.1`);
if (m.shifts.length) {
  const worst = m.shifts.sort((a, b) => b.value - a.value).slice(0, 4);
  for (const s of worst) console.log(`     shifted           ${s.value}  <${s.tag.toLowerCase()}> ${s.cls}`);
}

const blocking = m.longTasks.reduce((s, d) => s + Math.max(0, d - 50), 0);
console.log(`  Total Blocking Time  ${blocking}ms        target <= 200ms`);
console.log(`  long tasks           ${m.longTasks.length}  (worst ${Math.max(0, ...m.longTasks)}ms)`);
console.log(`  DOM nodes            ${m.domNodes}   depth ${m.maxDepth}`);
console.log(`  load event           ${loadMs}ms wall clock`);

console.log(`\n  BYTES BY TYPE`);
const total = Object.values(bytes).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(bytes).sort((a, b) => b[1] - a[1])) {
  if (v > 0) console.log(`     ${k.padEnd(12)} ${kb(v).padStart(9)}`);
}
console.log(`     ${"TOTAL".padEnd(12)} ${kb(total).padStart(9)}   (content-length only; uncompressed assets may under-report)`);
console.log(`     requests     ${requests.length}`);

await browser.close();
