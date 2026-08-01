/**
 * DOES `position: sticky` ACTUALLY STICK?
 *
 * Four sections on this site pin a short column beside a long one. Every one of
 * them was broken, silently, for the entire life of the project: the `<section>`
 * primitive carried `overflow: hidden`, which makes an element a scroll
 * container, and a scroll container becomes the nearest scrolling ancestor for
 * any sticky descendant. The section box never scrolls, so the descendants had
 * no range to stick within and travelled with the page.
 *
 * Nothing threw. Nothing failed to build. The typecheck passed, the lint passed,
 * both contrast gates passed. The only symptom was a dead rail beside each of
 * those sections — up to 731px in the evidence ledger — which read as a design
 * decision rather than a defect. That is the worst kind of bug this project can
 * have, because the existing gates are all about what is RENDERED and this one
 * is about what FAILS TO MOVE.
 *
 * So it gets a gate. The test is the one that actually distinguishes the two
 * states: scroll past the element and see whether its viewport position clamps
 * at its `top` offset (sticking) or tracks scroll 1:1 (not sticking).
 *
 * Runs against the built static export, in a real browser, at a real viewport.
 * There is no way to answer this question from the source.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = "out";
const PORT = 4419;
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Below this much pinning travel, sticky cannot produce a visible effect and
 * asserting on it is noise rather than signal. The appointment card is 621px in
 * a 712px block — 91px of travel, about a tenth of a viewport.
 */
const MIN_WINDOW = 120;

/**
 * Slack, in px, around the element's declared `top`. Sub-pixel layout and the
 * fixed header's own rounding move this by a pixel or two; 24 is far tighter
 * than the hundreds of px a non-sticking element drifts by.
 */
const TOLERANCE = 24;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    let file = join(ROOT, normalize(p));
    let body;
    try {
      body = await readFile(file);
    } catch {
      file += ".html";
      body = await readFile(file);
    }
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(PORT, r));

let chromium;
try {
  const pw = await import(
    new URL("../node_modules/playwright-core/index.js", import.meta.url).href
  );
  chromium = pw.chromium ?? pw.default.chromium;
} catch {
  console.log(
    "  check:sticky  SKIPPED — playwright-core not installed.\n" +
      "                install with `npm i --no-save playwright-core`",
  );
  server.close();
  process.exit(0);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: VIEWPORT });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
await page.waitForTimeout(5000);

/** Every section that pins something, found by looking rather than by a list. */
const targets = await page.evaluate(() => {
  const found = [];
  for (const sec of document.querySelectorAll("section")) {
    const el = sec.querySelector('[class*="sticky"]');
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "sticky") continue;
    /*
      The pinning WINDOW is what makes this measurable, and it differs wildly
      per section: a sticky element can only hold for
      `containingBlockHeight - elementHeight` px before its block runs out.
      Here that ranges from ~91px (the appointment card, which nearly fills its
      column) to over 1000px (the evidence heading beside its long ledger).

      A fixed set of probe offsets cannot test both. 200px steps stepped clean
      over the 91px window and reported a false failure. So each element gets
      probes derived from its own window instead.
    */
    const block = el.parentElement.getBoundingClientRect();
    found.push({
      id: sec.id || "(no id)",
      declaredTop: parseFloat(cs.top) || 0,
      sectionTop: Math.round(sec.getBoundingClientRect().top + scrollY),
      sectionHeight: Math.round(sec.getBoundingClientRect().height),
      elementHeight: Math.round(el.getBoundingClientRect().height),
      windowPx: Math.round(block.height - el.getBoundingClientRect().height),
    });
  }
  return found;
});

if (targets.length === 0) {
  console.log(
    "  check:sticky  no sticky columns found.\n" +
      "                if that is a surprise, the class was renamed and this\n" +
      "                gate is now measuring nothing.",
  );
  await browser.close();
  server.close();
  process.exit(1);
}

console.log(`\n  STICKY COLUMNS  (${VIEWPORT.width}x${VIEWPORT.height})\n`);

let failures = 0;

for (const t of targets) {
  /*
    DO NOT ASSERT "PINNED AT EVERY PROBE". That was the first version of this
    gate and it produced two false failures immediately, for opposite reasons:
    the assay ring had not yet REACHED its pin point at the first probe, and the
    evidence heading had legitimately RELEASED at the last one because its
    containing block ran out. Both are correct sticky behaviour. The
    section-contrast gate cried wolf four times before it was fixed the same
    way; the lesson is that the naive assertion is usually measuring the wrong
    thing.

    What actually separates working from broken is not WHERE the element sits at
    any moment — it is whether it ever STOPS moving while the page keeps moving.
    A broken sticky tracks scroll 1:1 for its entire life. A working one holds
    still for at least one stretch. So compare consecutive probes: if the page
    moved 300px and the element moved ~0, it held.
  */
  if (t.windowPx < MIN_WINDOW) {
    console.log(
      `  #${t.id.padEnd(14)} SKIP  only ${t.windowPx}px of pinning window ` +
        `(${t.elementHeight}px column in a ${t.elementHeight + t.windowPx}px block)\n` +
        `                       — too little travel for sticky to mean anything,\n` +
        `                       so there is nothing here for this gate to prove.`,
    );
    continue;
  }

  /* Five samples across the window, plus one past the end to catch release. */
  const step = Math.max(20, Math.round(t.windowPx / 4));
  const offsets = [0, step, step * 2, step * 3, step * 4, step * 4 + 200];
  const readings = [];
  for (const off of offsets) {
    const y = t.sectionTop + off;
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(450);
    const top = await page.evaluate((id) => {
      const sec = document.getElementById(id);
      const el = sec?.querySelector('[class*="sticky"]');
      return el ? Math.round(el.getBoundingClientRect().top) : null;
    }, t.id);
    readings.push({ off, top });
  }

  if (readings.some((r) => r.top === null)) {
    failures += 1;
    console.log(`  #${t.id.padEnd(14)} FAIL  element vanished mid-probe`);
    continue;
  }

  /** Per step: how far the element moved against how far the page moved. */
  const steps = [];
  for (let i = 1; i < readings.length; i += 1) {
    const scrolled = readings[i].off - readings[i - 1].off;
    const moved = readings[i - 1].top - readings[i].top;
    steps.push({
      from: readings[i - 1].off,
      to: readings[i].off,
      scrolled,
      moved,
      /*
        LAG, NOT STILLNESS. A short pinning window — the brand story's column is
        611px inside a 908px container, so it can only ever hold for ~297px —
        means a 200px probe step can straddle the pin and show the element
        moving most of the way anyway. Demanding near-zero movement failed that
        section even though it was sticking correctly.

        A genuinely broken sticky is in normal flow and moves EXACTLY as far as
        the page, every step, forever. So any measurable lag is proof the
        property engaged. 10px clears sub-pixel layout noise.
      */
      held: scrolled - moved > 10,
      pinned: Math.abs(readings[i].top - t.declaredTop) <= TOLERANCE,
    });
  }

  const heldSomewhere = steps.some((s) => s.held);
  const everPinned = readings.some(
    (r) => Math.abs(r.top - t.declaredTop) <= TOLERANCE,
  );

  if (heldSomewhere) {
    const held = steps.filter((s) => s.held).length;
    const lag = Math.max(...steps.map((s) => s.scrolled - s.moved));
    console.log(
      `  #${t.id.padEnd(14)} PASS  lagged the page on ${held}/${steps.length} ` +
        `steps (up to ${lag}px)` +
        (everPinned ? `, pinned at ${t.declaredTop}px` : ", narrow window"),
    );
  } else {
    failures += 1;
    console.log(
      `  #${t.id.padEnd(14)} FAIL  never stopped moving — not sticking at all`,
    );
    for (const s of steps) {
      console.log(
        `                       +${String(s.from).padStart(4)} -> +${String(s.to).padStart(4)}px:  ` +
          `page moved ${s.scrolled}, element moved ${s.moved}`,
      );
    }
    console.log(
      "                       An element that moves exactly as far as the page\n" +
        "                       is in normal flow. The usual cause is an ancestor\n" +
        "                       with `overflow: hidden`, which makes that ancestor\n" +
        "                       a scroll container and steals the sticky context.\n" +
        "                       Use `overflow: clip` — it clips identically without\n" +
        "                       creating a scroll container.",
    );
  }
}

await browser.close();
server.close();

console.log("");
if (failures > 0) {
  console.log(`  ${failures} sticky column(s) not sticking\n`);
  process.exit(1);
}
console.log(`  all ${targets.length} sticky column(s) pinning correctly\n`);
