/**
 * SECTION SCENE CONTRAST AUDIT
 *
 * The third contrast gate on this project, and the only one that has to drive a
 * real browser.
 *
 *   check-contrast.mjs             text vs FLAT surface tokens
 *   check-hero-contrast.mjs        text vs the hero film's decoded pixels
 *   this                           text vs a LIVE WEBGL RENDER
 *
 * WHY IT CANNOT BE REASONED ABOUT
 *
 * The ambient section scenes render between a section's opaque surface and its
 * copy. So text sits on lit metal under a moving key light, and a specular
 * highlight can travel anywhere in the frame. There is no static value to audit
 * — the only honest measurement is to render it and look.
 *
 * METHOD
 *
 * Serve the built export, scroll each scened section into view, wait for the
 * canvas to actually paint, then HIDE THE COPY and screenshot. That leaves the
 * true backdrop the text sits on, including the scrim. Every pixel in the band
 * where copy lives is then composited against the real type colours from
 * globals.css and the worst ratio is reported.
 *
 * Hiding the copy matters: sampling a screenshot that still contains the text
 * would measure the text against itself.
 *
 * NOT part of `npm run verify` — it needs a built `out/` and a browser. Manual
 * gate, listed in docs/GO-LIVE.md, to be re-run whenever a scene, a scrim or a
 * type colour changes.
 *
 * USAGE
 *   npm run build            (any target — it only needs out/)
 *   npm i --no-save playwright-core
 *   node scripts/check-section-scene-contrast.mjs
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'out';
const PORT = 4351;
const CSS = 'src/app/globals.css';

/* -------------------------------------------------------------------------- */
/* TYPE COLOURS — read from the stylesheet, never copied                      */
/* -------------------------------------------------------------------------- */

const TOKENS = Object.fromEntries(
  [...readFileSync(CSS, 'utf8').matchAll(/--color-([a-z-]+):\s*#([0-9a-fA-F]{6})/g)].map((m) => [
    m[1],
    m[2],
  ]),
);

function rgb(name) {
  const hex = TOKENS[name];
  if (!hex) throw new Error(`no --color-${name} in ${CSS}`);
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const IVORY = rgb('ivory');
const ASH = rgb('ash');

const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

/* -------------------------------------------------------------------------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    let file = join(ROOT, normalize(p));
    let body;
    try {
      body = await readFile(file);
    } catch {
      file += '.html';
      body = await readFile(file);
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise((r) => server.listen(PORT, r));

const pw = await import(pathToFileURL('node_modules/playwright-core/index.js').href);
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(7000);

/*
  EVERY SECTION, NOT JUST THE ONES WITH THEIR OWN SCENE.

  This used to filter for sections containing a scene scrim, which was right
  when 3D was strictly per-section: a section without a canvas had nothing
  moving behind it to audit.

  The firefly field changed that. It is ONE fixed canvas behind the entire
  page, showing through every surface via `--surface-alpha`, so moving light
  now falls behind sections that own no scene at all. Under the old filter this
  audit silently narrowed from seven sections to four at the exact moment its
  coverage needed to widen — the three `motes` scenes it had been keyed to were
  retired, and the sections they left behind still have a lit backdrop.

  So: audit every section with an id. A few will have nothing behind them but
  their own surface, and those pass trivially — a gate that also measures the
  easy cases costs seconds and cannot develop a blind spot.
*/
const sections = await page.evaluate(() =>
  [...document.querySelectorAll('section')].map((s) => s.id).filter(Boolean),
);

console.log(`\nSECTION SCENE CONTRAST — live render, ${sections.length} section(s)`);
console.log(`  type: ivory rgb(${IVORY.join(',')})  ash rgb(${ASH.join(',')})\n`);

let failures = 0;

for (const id of sections) {
  // Scroll it into view the way a person does, so Lenis and ScrollTrigger run
  // and the canvas actually mounts and paints.
  let guard = 0;
  while (guard++ < 200) {
    const done = await page.evaluate((sel) => {
      const el = document.getElementById(sel);
      if (!el) return true;
      const r = el.getBoundingClientRect();
      if (r.top < 80 && r.bottom > 200) return true;
      window.scrollBy(0, r.top > 0 ? 340 : -340);
      return false;
    }, id);
    if (done) break;
    await page.waitForTimeout(55);
  }
  await page.waitForTimeout(2600);

  /**
   * Collect the rectangles OF THE GLYPHS THEMSELVES, before anything is hidden.
   * Sampling is then restricted to those rectangles.
   *
   * This instrument has now been wrong five times, and every correction was a
   * narrowing. Sampling the whole section flagged: the fixed navigation's white
   * button label, two decorative gold ornaments that are correctly aria-hidden,
   * a clip box that ran past the section into the next one, and a presented
   * gold bar sitting in a column the layout deliberately leaves empty. So it was
   * narrowed to elements that contain text. Then it failed #services at 1.01:1 —
   * and the "text" it measured was the services opener's gold bar again, this
   * time inside the bounding box of a block element whose glyphs stop at 350px
   * but whose BOX runs the full shell width. An element's rectangle is not where
   * its text is.
   *
   * `Range.getClientRects()` on the text node returns the actual line boxes the
   * glyphs occupy — tight, per-line, and nothing else. That is the surface a
   * visitor reads against, so it is the only surface this gate may judge.
   *
   * A contrast gate that cries wolf gets ignored, which is worse than not having
   * it. Glyph rectangles only.
   */
  const textBoxes = await page.evaluate((sel) => {
    const el = document.getElementById(sel);
    if (!el) return [];
    const boxes = [];
    el.querySelectorAll("h1,h2,h3,h4,p,li,a,span,dt,dd,td,th").forEach((n) => {
      if (n.closest('[aria-hidden="true"]')) return;
      for (const c of n.childNodes) {
        if (c.nodeType !== 3 || c.textContent.trim().length <= 1) continue;
        const range = document.createRange();
        range.selectNodeContents(c);
        for (const r of range.getClientRects()) {
          if (r.width < 8 || r.height < 8) continue;
          if (r.bottom < 0 || r.top > innerHeight) continue;
          boxes.push({ x: r.left, y: r.top, w: r.width, h: r.height });
        }
      }
    });
    return boxes;
  }, id);

  // Hide the copy — sampling a shot that still contains text would measure the
  // text against itself — AND the fixed chrome. The navigation is
  // position:fixed, so it paints over every section; the first run of this audit
  // reported rgb(251,249,215) and a 1.28:1 failure that turned out to be the
  // nav's white button label, not the scene at all.
  await page.evaluate((sel) => {
    const el = document.getElementById(sel);
    if (!el) return;
    /*
     * Show ONLY the backdrop stack: the section's own surface, its ambient CSS
     * glow, and the 3D scene with its scrim. Everything else is hidden.
     *
     * `:not([aria-hidden])` was not enough. Decorative gold rules and quote
     * glyphs are correctly aria-hidden, so they survived that filter and became
     * the brightest pixel — the audit reported rgb(184,121,20) on #trust and
     * rgb(244,208,102) on #testimonials, which are exactly --color-gold-antique
     * and --color-ivory. Both were ornaments, not surfaces text sits on. Two
     * false alarms in two runs, both from sampling too wide.
     *
     * And "any direct child containing the scrim is backdrop" was not enough
     * either — it assumed scene and copy never share a wrapper. The services
     * opener wraps both in one band so the canvas can be scoped to the band
     * rather than a 4000px section, and this heuristic then skipped the band
     * wholesale: the heading stayed visible and the audit measured the
     * heading's own glyphs against themselves, reporting ivory at 1.01:1. The
     * scene host now carries an explicit `section-scene` marker class, and a
     * child that merely CONTAINS one is walked into rather than skipped.
     */
    const hideExceptBackdrop = (node) => {
      for (const n of node.children) {
        if (
          n.classList.contains('ambient-glow') ||
          n.classList.contains('section-scene')
        ) {
          continue; // the backdrop stack itself stays visible
        }
        if (n.querySelector('.section-scene')) {
          hideExceptBackdrop(n); // mixed wrapper: descend, hide only the copy
          continue;
        }
        n.setAttribute('data-audit-hidden', '1');
        n.style.visibility = 'hidden';
      }
    };
    hideExceptBackdrop(el);
    document.querySelectorAll('header, nav, [role="status"]').forEach((n) => {
      if (el.contains(n)) return;
      n.setAttribute('data-audit-hidden', '1');
      n.style.visibility = 'hidden';
    });
  }, id);
  await page.waitForTimeout(400);

  const box = await page.evaluate((sel) => {
    const el = document.getElementById(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    /*
     * Clip strictly to the VISIBLE INTERSECTION of the section and the viewport.
     *
     * The previous form clamped `y` to 0 when a section had scrolled above the
     * fold but did not shrink `height` to match, so the clip ran on to the bottom
     * of the window and swallowed whatever section came next. That is what made
     * #testimonials report rgb(244,208,102) — it was the Insights heading below
     * it, not the scene.
     */
    const top = Math.max(0, r.top);
    const bottom = Math.min(innerHeight, r.bottom);
    return {
      x: Math.max(0, r.left),
      y: top,
      width: Math.min(innerWidth, r.width),
      height: Math.max(0, bottom - top),
    };
  }, id);

  if (!box || box.height < 60) {
    console.log(`  SKIP  ${id} — not enough of it on screen to sample`);
    continue;
  }

  const shot = await page.screenshot({ clip: box, type: 'png' });

  // Restore the copy before moving on.
  await page.evaluate(() => {
    document.querySelectorAll('[data-audit-hidden]').forEach((n) => {
      n.style.visibility = '';
      n.removeAttribute('data-audit-hidden');
    });
  }, id);

  // Decode the PNG in-page: the browser already has a decoder, and this avoids
  // adding an image library just to read pixels back.
  const worst = await page.evaluate(
    async ({ dataUrl, boxes, originX, originY }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      let best = null;
      let bestLum = -1;

      // Boxes are in viewport coords; the shot is clipped to the section, so
      // shift them into image space.
      for (const b of boxes) {
        const x0 = Math.max(0, Math.round(b.x - originX));
        const y0 = Math.max(0, Math.round(b.y - originY));
        const x1 = Math.min(c.width, Math.round(b.x - originX + b.w));
        const y1 = Math.min(c.height, Math.round(b.y - originY + b.h));
        if (x1 <= x0 || y1 <= y0) continue;

        const { data } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
        for (let i = 0; i < data.length; i += 4) {
          const l =
            data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
          if (l > bestLum) {
            bestLum = l;
            best = [data[i], data[i + 1], data[i + 2]];
          }
        }
      }
      return best;
    },
    {
      dataUrl: `data:image/png;base64,${shot.toString("base64")}`,
      boxes: textBoxes,
      originX: box.x,
      originY: box.y,
    },
  );

  if (!worst) {
    console.log(`  SKIP  ${id} — no text boxes visible in this viewport`);
    continue;
  }

  const lead = contrast(over(IVORY, 0.72, worst), worst);
  const ashRatio = contrast(ASH, worst);
  const heading = contrast(IVORY, worst);

  const mark = (v, need) => `${v.toFixed(2)}:1 ${v >= need ? 'PASS' : 'FAIL'}`;
  const bad = lead < 4.5 || ashRatio < 4.5 || heading < 3;
  if (bad) failures += 1;

  console.log(`  ${bad ? 'FAIL' : 'PASS'}  #${id}`);
  console.log(`         brightest backdrop pixel rgb(${worst.join(',')})`);
  console.log(`         lead ivory/72  ${mark(lead, 4.5)}`);
  console.log(`         label ash      ${mark(ashRatio, 4.5)}`);
  console.log(`         heading ivory  ${mark(heading, 3)}`);
}

await browser.close();
server.close();

console.log('');
if (failures) {
  console.log(`SECTION SCENE CONTRAST FAILED — ${failures} section(s)\n`);
  process.exit(1);
}
console.log('SECTION SCENE CONTRAST PASSED — copy clears AA over every live scene\n');
