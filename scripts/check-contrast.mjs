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
  'void': '#050406',
  'char': '#0a0809',
  'stone': '#171310',
  'gunmetal': '#13100E',
  'walnut': '#120E09',
  'bronze': '#16110A',
};

// [label, hex, alpha, isLargeText, where]
const USES = [
  ['ivory', '#FEF3C7', 1, false, 'headings'],
  ['ivory/88', '#FEF3C7', 0.88, false, 'pillar titles'],
  ['ivory/85', '#FEF3C7', 0.85, false, 'review values'],
  ['ivory/80', '#FEF3C7', 0.8, false, 'consent label'],
  ['ivory/78', '#FEF3C7', 0.78, false, 'evidence values (css option-tile too)'],
  ['ivory/72', '#FEF3C7', 0.72, false, 'MAIN BODY COPY'],
  ['ivory/70', '#FEF3C7', 0.7, false, 'assay factor body'],
  ['ivory/62 (css .nav-link)', '#FEF3C7', 0.62, false, 'nav links'],
  ['ash', '#A2977F', 1, false, 'all secondary + fine print'],
  ['gold-antique', '#B87914', 1, false, 'labels, eyebrows, CTAs, chips'],
  ['gold-antique/75', '#B87914', 0.75, true, 'LARGE display numerals only'],
  ['gold-high/90', '#FCC933', 0.9, true, 'italic display accents'],
  ['gold-high/75', '#FCC933', 0.75, false, 'service summary italic (body size)'],
  ['gold-high', '#FCC933', 1, false, 'hover / in-balance'],
  ['gold-pale', '#FFFDDA', 1, false, 'CTA label, reference'],
  ['error', '#E5A68C', 1, false, 'form error messages'],
  ['ash (css ::placeholder)', '#A2977F', 1, false, 'field placeholder text'],
  // CRACKED GOLD. The craquelure multiplies the gold ramp beneath it, so each
  // stop is audited at the texture's darkest crack (175/255 = 0.686 of the
  // stop's value). Applied only at display scale, so the 3:1 large-text
  // threshold governs. If the crack floor in scripts/make-craquelure.mjs is
  // ever deepened, these are the rows that will catch it.
  ['crackle x #fef3c7', '#AEA789', 1, true, 'cracked gold — lightest stop'],
  ['crackle x #fcc933', '#AD8A23', 1, true, 'cracked gold — highlight stop'],
  ['crackle x #d99a33', '#956A23', 1, true, 'cracked gold — body stop'],
  ['crackle x #cc9022', '#8C6317', 1, true, 'cracked gold — DARKEST stop'],
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
