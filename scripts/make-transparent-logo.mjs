/**
 * KEY THE BLACK FIELD OUT OF THE SUPPLIED LOGO
 *
 * THE BUG THIS FIXES
 *
 * The supplied artwork is a flattened raster with its black background baked in —
 * `pal8` PNG and `yuv420p` WebP, neither of which even carries an alpha channel.
 * That was invisible while every surface behind it was near-black. The footer is
 * `mat-walnut`, a warm brown, so the mark sat on it as an obvious black rectangle.
 *
 * WHY NOT JUST THRESHOLD THE BLACK AWAY
 *
 * Because the artwork was RENDERED over black, every anti-aliased edge pixel is
 * already a blend of gold and black. Making those pixels transparent by a hard cut
 * leaves a dark fringe around every piece of filigree — the classic halo you see
 * when someone keys a logo badly. On a brown footer that halo is more obvious than
 * the original black box.
 *
 * The fix is to treat the source as PREMULTIPLIED. An image composited over black
 * satisfies `src = colour x alpha`, so recovering the original colour is a division
 * rather than a guess:
 *
 *     alpha  = brightness, ramped to 1 above the opacity floor
 *     colour = src / alpha        (un-premultiply)
 *
 * A half-lit edge pixel therefore comes back as full-strength gold at 50% alpha,
 * which is what it always was, and composites cleanly onto any colour.
 *
 * THRESHOLDS ARE MEASURED, NOT PICKED
 *
 * The script reports the corner values and a brightness histogram before it
 * applies anything, so the floor can be justified against the actual pixels rather
 * than chosen by eye. Run it and read the numbers.
 *
 * USAGE
 *   npm i --no-save ffmpeg-static
 *   node scripts/make-transparent-logo.mjs
 *
 * ffmpeg is used only as a codec — decode to raw RGBA, encode back — so no image
 * library is needed and the alpha maths stays here where it can be read.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FF = 'node_modules/ffmpeg-static/ffmpeg.exe';
const SOURCE = 'src/assets/pureweight-logo.png';
const MASTER = 'media/masters/pureweight-logo-on-black.png';

/** Outputs. Both keep their existing dimensions so no call site has to change. */
const TARGETS = [
  { path: 'src/assets/pureweight-logo.png', w: 1200, h: 1239, kind: 'png' },
  { path: 'public/brand/pureweight-logo.webp', w: 520, h: 537, kind: 'webp' },
];

/**
 * Brightness at or above which a pixel is fully opaque.
 *
 * Set from the measured histogram: the artwork's darkest intentional bronze sits
 * well above this, and the field sits well below it. Deliberately LOW — a high
 * floor would start eating the ornament's shadow detail, which is real artwork,
 * not background.
 */
const OPACITY_FLOOR = 0.14;

/**
 * Below this brightness a pixel becomes FULLY transparent, not faintly visible.
 *
 * Without it the ramp assigns tiny-but-non-zero alpha to the entire black field —
 * 76% of the image — because `brightness / 0.14` only reaches zero at literal zero.
 * Visually that is nothing. In bytes it is enormous: the alpha channel ends up
 * carrying low-amplitude noise across three quarters of its area, which is exactly
 * what an image codec cannot compress. It took the WebP from 64KB to 483KB.
 *
 * 5/255 is below anything the eye can distinguish from black on any screen, so
 * cutting there costs no visible detail and lets the alpha channel become a large
 * flat region that compresses to almost nothing.
 */
const TRANSPARENT_BELOW = 5 / 255;

if (!existsSync(FF)) {
  console.error(`ffmpeg not found at ${FF}. Run: npm i --no-save ffmpeg-static`);
  process.exit(2);
}

const scratch = join(tmpdir(), 'pw-logo-key');
mkdirSync(scratch, { recursive: true });

const ff = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', ...args]);

/* -------------------------------------------------------------------------- */
/* DECODE                                                                     */
/* -------------------------------------------------------------------------- */

// Key from the 1200px master, not the 520px WebP: the WebP is yuv420p, so its
// chroma is already subsampled and its gold edges are softer than the PNG's.
const src = existsSync(MASTER) ? MASTER : SOURCE;
const { w: W, h: H } = TARGETS[0];

const rawIn = join(scratch, 'in.raw');
ff(['-i', src, '-vf', `scale=${W}:${H}:flags=lanczos`, '-pix_fmt', 'rgba', '-f', 'rawvideo', rawIn, '-y']);
const pixels = readFileSync(rawIn);

console.log(`\nsource: ${src}  ->  ${W}x${H}  (${pixels.length} bytes RGBA)`);

/* -------------------------------------------------------------------------- */
/* MEASURE FIRST                                                              */
/* -------------------------------------------------------------------------- */

const brightnessAt = (i) => Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) / 255;

const corners = [
  ['top-left', 0, 0],
  ['top-right', W - 1, 0],
  ['bottom-left', 0, H - 1],
  ['bottom-right', W - 1, H - 1],
].map(([name, x, y]) => {
  const i = (y * W + x) * 4;
  return `${name} rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`;
});
console.log('corners:', corners.join('  '));

const BUCKETS = 10;
const hist = new Array(BUCKETS).fill(0);
const total = W * H;
for (let i = 0; i < pixels.length; i += 4) {
  hist[Math.min(BUCKETS - 1, Math.floor(brightnessAt(i) * BUCKETS))] += 1;
}
console.log('\nbrightness histogram (max channel):');
hist.forEach((n, b) => {
  const pct = (n / total) * 100;
  const lo = (b / BUCKETS).toFixed(1);
  const hi = ((b + 1) / BUCKETS).toFixed(1);
  const mark = b / BUCKETS < OPACITY_FLOOR ? ' <- keyed out / ramped' : '';
  console.log(
    `  ${lo}-${hi}  ${pct.toFixed(1).padStart(5)}%  ${'#'.repeat(Math.round(pct / 2))}${mark}`,
  );
});

/* -------------------------------------------------------------------------- */
/* KEY + UN-PREMULTIPLY                                                       */
/* -------------------------------------------------------------------------- */

let fullyTransparent = 0;
let partial = 0;
let opaque = 0;

const out = Buffer.alloc(pixels.length);

for (let i = 0; i < pixels.length; i += 4) {
  const b = brightnessAt(i);
  const a = b < TRANSPARENT_BELOW ? 0 : Math.min(1, b / OPACITY_FLOOR);

  if (a === 0) {
    // Field. Zero the colour too: a transparent pixel that still carries colour
    // data can bleed when the image is scaled or mipmapped.
    out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
    fullyTransparent += 1;
    continue;
  }

  // Un-premultiply. This is what removes the dark fringe: an edge pixel that was
  // 50% gold over black comes back as full-strength gold at 50% alpha.
  out[i] = Math.min(255, Math.round(pixels[i] / a));
  out[i + 1] = Math.min(255, Math.round(pixels[i + 1] / a));
  out[i + 2] = Math.min(255, Math.round(pixels[i + 2] / a));
  out[i + 3] = Math.round(a * 255);

  if (a >= 0.999) opaque += 1;
  else partial += 1;
}

const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
console.log(
  `\nkeyed: ${pct(fullyTransparent)} fully transparent, ` +
    `${pct(partial)} partial (the anti-aliased edges), ${pct(opaque)} opaque`,
);

if (fullyTransparent / total < 0.05) {
  console.error('\nFewer than 5% of pixels keyed out. That does not look like a logo on');
  console.error('a black field — check the source before trusting this output.');
  process.exit(1);
}

const rawOut = join(scratch, 'out.raw');
writeFileSync(rawOut, out);

/* -------------------------------------------------------------------------- */
/* ENCODE                                                                     */
/* -------------------------------------------------------------------------- */

// Preserve the original opaque artwork once, before overwriting it.
if (!existsSync(MASTER)) {
  mkdirSync('media/masters', { recursive: true });
  renameSync(SOURCE, MASTER);
  console.log(`\npreserved the original opaque artwork at ${MASTER}`);
}

console.log('');
for (const t of TARGETS) {
  const args = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', rawOut];

  if (t.kind === 'webp') {
    /**
     * Lossy, not lossless. Lossless was tried and measured at 483KB against the
     * original opaque 64KB — this artwork is continuous gold gradient, which is
     * the worst possible case for lossless. Lossy WebP keeps alpha in its own
     * ALPH chunk, so the transparency stays crisp while the colour compresses.
     */
    args.push(
      '-vf', `scale=${t.w}:${t.h}:flags=lanczos`,
      '-c:v', 'libwebp',
      '-lossless', '0',
      '-quality', '86',
      '-compression_level', '6',
      '-pix_fmt', 'yuva420p',
    );
  } else {
    args.push('-vf', `scale=${t.w}:${t.h}:flags=lanczos`, '-c:v', 'png');
  }

  ff([...args, '-frames:v', '1', t.path, '-y']);
  const size = readFileSync(t.path).length;
  console.log(`  wrote ${t.path}  ${t.w}x${t.h}  ${(size / 1024).toFixed(1)} KB`);
}

/* -------------------------------------------------------------------------- */
/* PROVE IT COMPOSITES                                                        */
/* -------------------------------------------------------------------------- */

// The whole point is that it works on a NON-black surface, so it is composited
// over both the page ground and the footer's walnut and written out for review.
const PROOFS = [
  ['void', '0x000000'],
  ['walnut', '0x1a1207'],
];

for (const [name, colour] of PROOFS) {
  const proof = join(scratch, `proof-${name}.png`);
  ff([
    '-f', 'lavfi', '-i', `color=c=${colour}:s=${TARGETS[1].w}x${TARGETS[1].h}`,
    '-i', TARGETS[1].path,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto',
    '-frames:v', '1', proof, '-y',
  ]);
  console.log(`  proof over ${name}: ${proof}`);
}

console.log('\nDone. Inspect the two proofs — the mark must show NO dark rectangle');
console.log('and NO grey halo around the filigree on the walnut one.\n');
