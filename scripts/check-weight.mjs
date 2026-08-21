/**
 * THE NETWORK BUDGET, ENFORCED.
 *
 * This repository has fifteen check-* gates and, until now, none of them
 * measured what a visitor downloads. `check:budget` measures triangles and
 * draw calls — a GPU budget, genuinely useful, and frequently mistaken for
 * this. `check:perf` measures frame times. `check:mobile` reports bytes but
 * only reports them, and only against a live URL.
 *
 * So every byte regression on this site was caught by somebody remembering to
 * look. Today alone that gap held: a duplicated 941KB copy of three.js, four
 * upright font faces that render nothing, and a 61KB logo preload for a 240px
 * mark. None of them failed a gate; all of them were found by reading the
 * build output by hand.
 *
 * This reads the BUILT ARTEFACT rather than a live page, which is the
 * distinction that makes it usable in CI: no browser, no network, no timing
 * variance, and it fails before a regression can be deployed rather than
 * after.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not measure per-page transfer, because a static export has no
 * per-page manifest to measure and guessing at one would produce a number
 * that drifts from reality and gets ignored. It measures the classes of asset
 * whose growth is actually silent: total JavaScript, the largest single chunk,
 * CSS, fonts, and media. If those hold, page weight holds.
 *
 * Budgets sit roughly 15-20% above the measured value. That band is chosen:
 * tight enough that a real regression trips it, loose enough that swapping a
 * photograph does not. The first draft of this file used round numbers with
 * 200%+ headroom on images — a limit nothing could ever breach, which is
 * decoration wearing a gate's clothes. Each budget carries the figure it was
 * set from, so a future reader can tell principled from arbitrary.
 *
 *   npm run check:weight
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

if (!existsSync(out)) {
  console.error("  out/ missing. Build first: GITHUB_PAGES=true npm run build");
  process.exit(1);
}

/** Every file under a directory, recursively. */
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(out);
const sizeOf = (f) => statSync(f).size;
const sum = (list) => list.reduce((t, f) => t + sizeOf(f), 0);

const js = files.filter((f) => extname(f) === ".js");
const css = files.filter((f) => extname(f) === ".css");
const fonts = files.filter((f) => [".woff2", ".woff", ".ttf"].includes(extname(f)));
const media = files.filter((f) => [".mp4", ".webm", ".mov"].includes(extname(f)));
const images = files.filter((f) =>
  [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(extname(f)),
);

const largestJs = js.length ? Math.max(...js.map(sizeOf)) : 0;

/*
  UNCOMPRESSED bytes on disk. Not what crosses the wire — Brotli takes JS to
  roughly a quarter of this — but it is the number that is stable, comparable
  between builds, and free to measure. A budget's job is to catch GROWTH, and
  growth shows identically either way.
*/
const KB = 1024;
const checks = [
  {
    label: "total JavaScript",
    actual: sum(js),
    limit: 3100 * KB,
    from: "measured 2649KB after removing the duplicated three.js chunk; ~17% headroom",
  },
  {
    label: "largest single chunk",
    actual: largestJs,
    limit: 1000 * KB,
    from: "three.js + R3F measured 936KB; a second copy here would mean a new async boundary",
  },
  {
    label: "total CSS",
    actual: sum(css),
    limit: 120 * KB,
    from: "measured 101KB after trimming unused Playfair faces; ~19% headroom",
  },
  {
    label: "total fonts",
    actual: sum(fonts),
    limit: 235 * KB,
    from: "measured 198KB across 16 files; a new family or style would breach this",
  },
  {
    label: "total video",
    actual: sum(media),
    limit: 1100 * KB,
    from: "measured 1.0MB across both cuts; re-encoding should move this DOWN",
  },
  {
    label: "total images",
    actual: sum(images),
    limit: 950 * KB,
    from: "measured 807KB of photography and brand art; ~18% headroom",
  },
];

const kb = (n) => `${(n / KB).toFixed(0)} KB`;
console.log("\nNETWORK WEIGHT — uncompressed bytes in out/\n");

let failed = 0;
for (const c of checks) {
  const pct = Math.round((c.actual / c.limit) * 100);
  const ok = c.actual <= c.limit;
  if (!ok) failed += 1;
  console.log(
    `  ${ok ? "PASS" : "OVER"}  ${c.label.padEnd(22)} ${kb(c.actual).padStart(9)} / ${kb(c.limit).padStart(9)}  ${String(pct).padStart(3)}%`,
  );
  if (!ok) console.log(`        budget set from: ${c.from}`);
}

console.log(`\n  ${files.length} files, ${kb(sum(files))} total in out/`);

if (failed) {
  console.error(
    `\nWEIGHT CHECK FAILED — ${failed} budget(s) exceeded.\n\n` +
    "  If the growth is deliberate, raise the limit IN THE SAME COMMIT and say\n" +
    "  in the message what bought the bytes. A budget quietly raised to make a\n" +
    "  build pass is not a budget.\n",
  );
  process.exit(1);
}

console.log("  weight check: every budget holds\n");
