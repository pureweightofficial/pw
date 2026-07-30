/**
 * HERO FILM CONTRAST AUDIT
 *
 * The other contrast script checks text tokens against the site's flat surface
 * colours. It cannot see the hero, because the hero's backdrop is a moving
 * image: a 4.5-second film whose specular highlights peak brighter than the
 * ivory text laid over them. Measuring flat tokens and declaring the hero
 * accessible would be exactly the kind of unmeasured claim that has already had
 * to be retracted once on this project.
 *
 * So this walks every sampled frame, pixel by pixel, composites the real scrim
 * over the real film, and reports the worst ratio any hero text can encounter.
 *
 * It is deliberately NOT part of `npm run verify`: it needs ffmpeg to decode the
 * film, which is not a project dependency. It is a manual gate, listed in
 * docs/GO-LIVE.md, to be re-run whenever the film or the scrim changes.
 *
 * USAGE
 *   npx ffmpeg -i public/video/hero-atmosphere.mp4 \
 *       -vf "fps=4,scale=320:180" -pix_fmt rgb24 -f rawvideo frames.raw -y
 *   node scripts/check-hero-contrast.mjs frames.raw
 *
 * The scrim stops and the film dim are PARSED OUT OF globals.css rather than
 * duplicated here, so this cannot silently drift from what actually ships.
 */
import { readFileSync } from 'node:fs';

const CSS = 'src/app/globals.css';
const W = 320;
const H = 180;

/* -------------------------------------------------------------------------- */
/* WHAT THE STYLESHEET ACTUALLY SAYS                                          */
/* -------------------------------------------------------------------------- */

function readShippedTreatment() {
  const css = readFileSync(CSS, 'utf8');

  // The wide-viewport ramp is the last .hero-scrim block; the portrait one above
  // it never overlaps the copy, so it is not what needs defending.
  const blocks = [...css.matchAll(/\.hero-scrim \{[\s\S]*?\}/g)].map((m) => m[0]);
  if (blocks.length === 0) throw new Error(`no .hero-scrim rule found in ${CSS}`);

  const stops = [...blocks.at(-1).matchAll(/rgba\(5, 4, 6, ([\d.]+)\) ([\d.]+)%/g)].map((m) => [
    Number(m[2]) / 100,
    Number(m[1]),
  ]);
  if (stops.length < 2) throw new Error('could not parse the scrim gradient stops');

  const dimMatch = /filter: brightness\(([\d.]+)\)/.exec(css);
  if (!dimMatch) throw new Error('could not parse the film brightness filter');

  const tx = /transform: scale\(([\d.]+)\) translateX\(([\d.]+)%\)/.exec(css);
  if (!tx) throw new Error('could not parse the film transform');

  return {
    stops,
    dim: Number(dimMatch[1]),
    scale: Number(tx[1]),
    shift: Number(tx[2]) / 100,
  };
}

/* -------------------------------------------------------------------------- */
/* COLOUR MATHS — WCAG 2.x, composited in gamma space as browsers do           */
/* -------------------------------------------------------------------------- */

const VOID = [5, 4, 6];
const IVORY = [254, 243, 199];
const ASH = [162, 151, 127];

const luminance = ([r, g, b]) => {
  const channel = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

const rampAt = (stops, x) => {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x0, a0] = stops[i - 1];
    const [x1, a1] = stops[i];
    if (x <= x1) return a0 + (a1 - a0) * ((x - x0) / (x1 - x0));
  }
  return stops.at(-1)[1];
};

/* -------------------------------------------------------------------------- */
/* THE BANDS                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where hero text can actually be, as a fraction of viewport width.
 *
 * Both right edges are taken from the WORST case, which is a narrow desktop
 * (1280): the padding is a 5vw percentage but the max-widths are fixed rem, so
 * the copy occupies its largest fraction of the screen there, not on a 1920.
 *
 *   small  4.5:1  label, lead paragraph, CTA labels — bounded by max-w-xl
 *   large  3.0:1  the h1 — bounded by max-w-4xl
 */
const BANDS = {
  small: { x: [0.037, 0.505], y: [0.28, 0.92], need: 4.5 },
  large: { x: [0.037, 0.76], y: [0.3, 0.68], need: 3.0 },
};

/* -------------------------------------------------------------------------- */

const rawPath = process.argv[2];
if (!rawPath) {
  console.error('usage: node scripts/check-hero-contrast.mjs <frames.raw>');
  console.error('see the header of this file for the ffmpeg command');
  process.exit(2);
}

const treatment = readShippedTreatment();
const raw = readFileSync(rawPath);
const frames = Math.floor(raw.length / (W * H * 3));
if (frames === 0) throw new Error(`${rawPath} holds no ${W}x${H} rgb24 frames`);

// Source u -> screen x, through the film's own scale and nudge.
const screenX = (u) => 0.5 + (u - 0.5) * treatment.scale + treatment.shift;

const worst = { lead: Infinity, ash: Infinity, h1: Infinity };
let worstAt = null;

for (let f = 0; f < frames; f++) {
  const frameBase = f * W * H * 3;

  for (let py = 0; py < H; py++) {
    const v = py / H;

    for (let px = 0; px < W; px++) {
      const x = screenX(px / W);
      const i = frameBase + (py * W + px) * 3;

      const film = [raw[i], raw[i + 1], raw[i + 2]].map((c) =>
        Math.min(255, c * treatment.dim),
      );
      const bg = over(VOID, rampAt(treatment.stops, x), film);

      const S = BANDS.small;
      if (x >= S.x[0] && x <= S.x[1] && v >= S.y[0] && v <= S.y[1]) {
        // text-ivory/72 is a translucent glyph: it composites over bg first.
        const lead = contrast(over(IVORY, 0.72, bg), bg);
        if (lead < worst.lead) {
          worst.lead = lead;
          worstAt = {
            t: (f / 4).toFixed(2),
            x: x.toFixed(3),
            y: v.toFixed(3),
            film: film.map(Math.round),
            bg: bg.map(Math.round),
          };
        }
        worst.ash = Math.min(worst.ash, contrast(ASH, bg));
      }

      const L = BANDS.large;
      if (x >= L.x[0] && x <= L.x[1] && v >= L.y[0] && v <= L.y[1]) {
        worst.h1 = Math.min(worst.h1, contrast(IVORY, bg));
      }
    }
  }
}

const line = (label, value, need) => {
  const ok = value >= need;
  return `  ${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(6)}:1 (need ${need})  ${label}`;
};

console.log('HERO FILM CONTRAST — real pixels, not tokens');
console.log(
  `  ${frames} frames at 4fps  |  film dim ${treatment.dim}  |  ` +
    `scale ${treatment.scale} shift ${treatment.shift * 100}%`,
);
console.log('');
console.log(line('lead paragraph — text-ivory/72', worst.lead, 4.5));
console.log(line('eyebrow label — text-ash', worst.ash, 4.5));
console.log(line('headline — text-ivory (large)', worst.h1, 3.0));
console.log('');
console.log(
  `  worst backdrop rgb(${worstAt.bg.join(',')}) from film pixel ` +
    `rgb(${worstAt.film.join(',')}) at t=${worstAt.t}s x=${worstAt.x} y=${worstAt.y}`,
);

const failed = worst.lead < 4.5 || worst.ash < 4.5 || worst.h1 < 3;
console.log('');
console.log(failed ? '  FAILED — hero copy does not clear WCAG AA' : '  ALL CLEAR');
process.exit(failed ? 1 : 0);
