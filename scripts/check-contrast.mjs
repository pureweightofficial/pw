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

const SURFACES = {
  'void': '#030303',
  'char': '#090908',
  'stone': '#151412',
  'gunmetal': '#12110F',
  'walnut': '#100D0A',
  'bronze': '#14100B',
};

// [label, hex, alpha, isLargeText, where]
const USES = [
  ['ivory', '#E8E0D2', 1, false, 'headings'],
  ['ivory/88', '#E8E0D2', 0.88, false, 'pillar titles'],
  ['ivory/85', '#E8E0D2', 0.85, false, 'review values'],
  ['ivory/80', '#E8E0D2', 0.8, false, 'consent label'],
  ['ivory/78', '#E8E0D2', 0.78, false, 'evidence values (css option-tile too)'],
  ['ivory/72', '#E8E0D2', 0.72, false, 'MAIN BODY COPY'],
  ['ivory/70', '#E8E0D2', 0.7, false, 'assay factor body'],
  ['ivory/62 (css .nav-link)', '#E8E0D2', 0.62, false, 'nav links'],
  ['ash', '#918D84', 1, false, 'all secondary + fine print'],
  ['gold-antique', '#B98220', 1, false, 'labels, eyebrows, CTAs, chips'],
  ['gold-antique/75', '#B98220', 0.75, true, 'LARGE display numerals only'],
  ['gold-high/90', '#F2CE72', 0.9, true, 'italic display accents'],
  ['gold-high/75', '#F2CE72', 0.75, false, 'service summary italic (body size)'],
  ['gold-high', '#F2CE72', 1, false, 'hover / in-balance'],
  ['gold-pale', '#FFE9A8', 1, false, 'CTA label, reference'],
  ['error', '#E5A68C', 1, false, 'form error messages'],
  ['ash (css ::placeholder)', '#918D84', 1, false, 'field placeholder text'],
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
