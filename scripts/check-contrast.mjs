import { readFileSync } from 'node:fs';
/**
 * WCAG contrast audit of the Pureweight palette, as actually used — RE-RUN
 * after removing alpha from muted-grey and gold text.
 *
 * Also covers the colours declared directly in globals.css (nav links, field
 * placeholders, option tiles), which the Tailwind class sweep did not touch.
 */

const hex = (h) => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const over = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
const luminance = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/**
 * TOKENS ARE READ FROM THE STYLESHEET, NOT COPIED INTO THIS FILE.
 *
 * They used to be hardcoded hex literals here. That is a silent-false-pass
 * waiting to happen: repalette globals.css and this script keeps cheerfully
 * auditing the colours the site no longer uses. It nearly happened on the move
 * to pure black and gold type, which is what prompted this.
 *
 * Now every colour is resolved by token name at run time, so the audit cannot
 * drift from what ships, and an unknown token is a hard error rather than an
 * `undefined` that quietly evaluates to a passing ratio.
 */
const CSS = readFileSync('src/app/globals.css', 'utf8');

const TOKENS = Object.fromEntries(
  [...CSS.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => [m[1], m[2]]),
);

function token(name) {
  const hex = TOKENS[name];
  if (!hex) {
    throw new Error(
      `No --color-${name} in globals.css. Tokens found: ${Object.keys(TOKENS).join(', ')}`,
    );
  }
  return hex;
}

/**
 * The ambient glow's PEAK COMPOSITE, treated as a real surface.
 *
 * The glow lightens whatever is behind it, which lowers text contrast — silently,
 * and only in the places it happens to have drifted to. A flat-surface audit
 * cannot see that at all, so the brightest point the glow can reach is computed
 * here from the same alpha the stylesheet uses and added to the surface list.
 *
 * Worst case is BOTH pools overlapping at full strength over the darkest ground,
 * which is why they are composited in sequence rather than averaged.
 */
function glowPeak() {
  // Quote-AGNOSTIC on purpose. Prettier normalises CSS attribute selectors to
  // double quotes, the hand-written source used single, and a regex pinned to
  // one of them broke the first time the stylesheet went through the
  // formatter — CI failed on a commit whose local check had run against the
  // pre-format file. ['\"] accepts both so no formatter pass can break this.
  const warm = /\.ambient-glow\[data-intensity=['\"]warm['\"]\]\s*\{[^}]*--pool-alpha:\s*([\d.]+)/.exec(CSS);
  if (!warm) throw new Error('could not parse the warm --pool-alpha from globals.css');
  const alpha = Number(warm[1]);

  // The gradient's centre stop, read off the .ambient-pool rule.
  const stop = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*var\(--pool-alpha\)\)/.exec(CSS);
  if (!stop) throw new Error('could not parse the pool gradient centre colour');
  const gold = [Number(stop[1]), Number(stop[2]), Number(stop[3])];

  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // Two pools can overlap, so composite gold over the ground twice.
  let bg = hexToRgb(token('void'));
  for (let i = 0; i < 2; i++) {
    bg = bg.map((c, k) => gold[k] * alpha + c * (1 - alpha));
  }
  const to255 = (c) => Math.round(c).toString(16).padStart(2, '0');
  return `#${bg.map(to255).join('')}`;
}

const SURFACES = {
  void: token('void'),
  char: token('char'),
  stone: token('stone'),
  gunmetal: token('gunmetal'),
  iron: token('iron'),
  'void + glow peak': glowPeak(),
};

// [label, hex, alpha, isLargeText, where]
const USES = [
  ['ivory', token('ivory'), 1, false, 'headings'],
  ['ivory/88', token('ivory'), 0.88, false, 'pillar titles'],
  ['ivory/85', token('ivory'), 0.85, false, 'review values'],
  ['ivory/80', token('ivory'), 0.8, false, 'consent label'],
  ['ivory/78', token('ivory'), 0.78, false, 'evidence values (css option-tile too)'],
  ['ivory/72', token('ivory'), 0.72, false, 'MAIN BODY COPY'],
  ['ivory/70', token('ivory'), 0.7, false, 'assay factor body'],
  ['ivory/62 (css .nav-link)', token('ivory'), 0.62, false, 'nav links'],
  ['ivory/60', token('ivory'), 0.6, false, 'rates skeleton'],
  ['ash', token('ash'), 1, false, 'all secondary + fine print'],
  ['gold-antique', token('gold-antique'), 1, false, 'labels, eyebrows, CTAs, chips'],
  ['gold-antique/75', token('gold-antique'), 0.75, true, 'LARGE display numerals only'],
  ['gold-high/90', token('gold-high'), 0.9, true, 'italic display accents'],
  ['gold-high/75', token('gold-high'), 0.75, false, 'service summary italic (body size)'],
  ['gold-high', token('gold-high'), 1, false, 'hover / in-balance / rate figures'],
  ['gold-pale', token('gold-pale'), 1, false, 'CTA label, reference'],
  ['gold-rich', token('gold-rich'), 1, false, 'rates table figures'],
  // CRACKED GOLD. The craquelure multiplies the gold ramp beneath it, so each
  // stop is audited at the texture's darkest crack (175/255 = 0.686 of the
  // stop's value). Applied only at display scale, so the 3:1 large-text
  // threshold governs. If the crack floor in scripts/make-craquelure.mjs is
  // ever deepened, these are the rows that will catch it.
  ...[
    ['lightest', token('ivory')],
    ['highlight', token('gold-high')],
    ['body', token('gold-rich')],
    ['darkest', '#cc9022'],
  ].map(([which, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    const mul = (v) => Math.round(v * (175 / 255));
    const cracked =
      '#' +
      [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        .map((c) => mul(c).toString(16).padStart(2, '0'))
        .join('');
    return [`crackle x ${hex}`, cracked, 1, true, `cracked gold — ${which} stop`];
  }),
];

let failures = 0;
let worst = { r: Infinity };

console.log('\nWCAG 2.1 AA — re-audit after fixes\n');

for (const [label, fgHex, alpha, isLarge, where] of USES) {
  const need = isLarge ? 3.0 : 4.5;
  let min = Infinity;
  let minSurface = '';

  for (const [sName, sHex] of Object.entries(SURFACES)) {
    const bg = hex(sHex);
    const r = ratio(over(hex(fgHex), bg, alpha), bg);
    if (r < min) {
      min = r;
      minSurface = sName;
    }
  }

  const pass = min >= need;
  if (!pass) failures += 1;
  if (min < worst.r && pass) worst = { r: min, label };

  console.log(
    `  ${pass ? 'PASS' : 'FAIL'} ${min.toFixed(2).padStart(6)}:1 (need ${need})  ${label.padEnd(26)} worst on ${minSurface.padEnd(9)} ${where}`,
  );
}

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILING'} — tightest passing margin: ${worst.label} at ${worst.r.toFixed(2)}:1\n`);
process.exit(failures ? 1 : 0);
