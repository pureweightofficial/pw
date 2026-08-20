/**
 * IS THE PAGE ACTUALLY SMOOTH?
 *
 * Scrolls a running site and reports frame times, dropped frames and long-task
 * time. It exists because "the website is a little slow, not smooth" was the
 * only report of a problem that no gate in this repository could see, and the
 * cause turned out to be structural and long-standing rather than recent.
 *
 * WHAT IT FOUND, on one machine, one build apart, scrolling the homepage:
 *
 *     no backdrop canvas    59.9fps    0 of 798 frames dropped    1.8s long tasks
 *     the firefly field     14.3fps  295 of 356 dropped          18.9s long tasks
 *     the gold world        17.1fps  273 of 315 dropped          26.7s long tasks
 *     world + section scenes 15.9fps                             42.8s long tasks
 *
 * A fixed full-viewport WebGL canvas under this page's translucent section
 * surfaces costs about 43fps, and the cost is NOT the scene: removing the
 * environment map, the shadows, the physical material and half the pixel ratio
 * together moved it by roughly one frame. The firefly field had been charging
 * that price for months without anyone measuring it.
 *
 * AND WHAT IT LATER CORRECTED, which matters more than the numbers above.
 *
 * The paragraph beneath those figures asserted that the cost of a fixed
 * full-viewport canvas is COMPOSITING — the browser repainting the page every
 * frame because translucent section surfaces sit over a live canvas — and
 * "NOT the scene". That conclusion was drawn from one experiment (stripping
 * the environment map, shadows, material and half the pixel ratio moved it by
 * about a frame) and it was wrong as a general rule.
 *
 * Tested directly when the persistent world was brought back, same build,
 * same machine, interleaved, differing only in --surface-alpha:
 *
 *     world behind TRANSLUCENT surfaces (81%)   20.3fps, 20.6fps
 *     world behind OPAQUE surfaces    (100%)    20.6fps, 20.7fps
 *
 * Identical. Translucency costs nothing measurable. The bill is the renderer
 * drawing a full-viewport scene sixty times a second, which is a completely
 * different problem with completely different fixes — and the earlier reading
 * had ruled those fixes out. Halving the world's frame rate and dropping its
 * DPR to 0.85 recovered ~4fps immediately (23.5 -> 27.3, interleaved):
 *
 *     world at 60fps, dpr 1.25    23.3fps, 23.6fps
 *     world at 30fps, dpr 0.85    26.7fps, 27.8fps
 *
 * Dust in the world measured free (28.5/27.8 with, 28.3/26.9 without — the
 * with-dust runs were nominally faster, which is how you know you are inside
 * the noise floor and should stop optimising it).
 *
 * The standing figure for the persistent world, against the windowed
 * architecture it replaced: ~27.5fps against ~37.7fps. That is a real cost,
 * accepted deliberately for a design reason, and it is written here so nobody
 * re-derives it by accident.
 *
 * WHAT IT LATER CLEARED. When the journey scene's canvas became one viewport
 * tall and STICKY, the obvious worry was that this re-introduced exactly the
 * full-viewport canvas the numbers above condemn. Interleaved A/B/A/B on one
 * machine within minutes, both variants served simultaneously on separate
 * ports so neither could be measured against a stale server:
 *
 *     A  sticky (viewport-tall canvas)     31.8fps, 30.9fps
 *     B  absolute (section-tall canvas)    29.1fps, 29.0fps
 *
 * Sticky is FASTER, and the reason is geometric rather than clever: the
 * section is ~2,015px tall and the viewport is 900px, so the sticky canvas
 * rasterises well under half the pixels of the absolute one it replaced. The
 * 43fps penalty above belongs to a FIXED canvas the whole document composites
 * over, not to a canvas that merely fills the screen.
 *
 * (The first attempt at this A/B was invalid and is worth remembering: the
 * per-run server was started and killed around each measurement, the kill did
 * not take, and every subsequent run silently hit the still-running first
 * server. Four numbers, all of variant A, all agreeing beautifully. Serve both
 * variants at once on separate ports and assert they differ before measuring.)
 *
 * Run it against production or a local `next start`. Note that `next start`
 * reads .next at BOOT — rebuilding underneath a running server measures the
 * old build, which cost an hour here before it was noticed.
 *
 * ABSOLUTE NUMBERS ARE ONLY COMPARABLE BACK-TO-BACK ON A QUIET MACHINE.
 * The same build measured 31.7fps and 14.1fps a few hours apart on the dev
 * machine — the second run with 1.4GB of 7.8GB RAM free under a full browser.
 * A/B comparisons must be interleaved (A,B,A,B) within minutes, and a control
 * re-run of the baseline belongs at the END of any session that concludes
 * anything. One sticky-mount experiment was nearly recorded as "3x worse"
 * when much of the difference was the machine, not the code.
 *
 * Usage:  npm run check:perf [url] [cpuThrottle]
 */
import { chromium } from "playwright-core";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.argv[2] || "https://pw-peach-psi.vercel.app/";
const CPU = Number(process.argv[3] || 1); // 1 = no throttle, 4 = mid mobile

function findChrome() {
  for (const x of [process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome"].filter(Boolean)) if (existsSync(x)) return x;
  const cache = join(process.env.LOCALAPPDATA || "", "ms-playwright");
  for (const d of readdirSync(cache)) {
    const e = join(cache, d, "chrome-win64", "chrome.exe");
    if (existsSync(e)) return e;
  }
  return null;
}

const browser = await chromium.launch({ executablePath: findChrome() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });

await page.addInitScript(() => {
  window.__frames = [];
  let last = performance.now();
  const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__long = 0;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long += e.duration; })
      .observe({ type: "longtask", buffered: true });
  } catch {}
});

await page.goto(URL, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(9000);

// Steady-state canvas count and WebGL context count at several depths.
const travel = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight);

await page.evaluate(() => { window.__frames.length = 0; });

const counts = [];
for (const f of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), Math.round(travel * f));
  await page.waitForTimeout(2200);
  counts.push(await page.evaluate(() => document.querySelectorAll("canvas").length));
}

const r = await page.evaluate(() => {
  const f = window.__frames.filter((d) => d > 0 && d < 500);
  f.sort((a, b) => a - b);
  const pct = (p) => f[Math.floor(f.length * p)] || 0;
  const mean = f.reduce((s, x) => s + x, 0) / (f.length || 1);
  return {
    frames: f.length,
    meanMs: +mean.toFixed(1),
    fps: +(1000 / mean).toFixed(1),
    p50: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    worst: +(f[f.length - 1] || 0).toFixed(1),
    janky: f.filter((d) => d > 33).length,
    longMs: Math.round(window.__long),
  };
});

console.log(`  ${URL}  (cpu x${CPU})`);
console.log(`  canvases while scrolling: ${counts.join(" → ")}   peak ${Math.max(...counts)}`);
console.log(`  mean ${r.meanMs}ms  =>  ${r.fps} fps`);
console.log(`  p50 ${r.p50}ms   p95 ${r.p95}ms   worst ${r.worst}ms`);
console.log(`  frames over 33ms (dropped below 30fps): ${r.janky} of ${r.frames}`);
console.log(`  long-task time during scroll: ${r.longMs}ms`);

await browser.close();
