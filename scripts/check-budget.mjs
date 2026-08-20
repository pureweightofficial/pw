/**
 * SCENE BUDGET AUDIT
 *
 * Counts what the GPU is actually asked to do: triangles, draw calls and
 * texture memory. Written because the scene is generated procedurally, which
 * makes it very easy to be careless — a LatheGeometry with 72 segments costs
 * the same whether or not anyone can see the difference from 6 metres away.
 *
 * Budgets are set for the weakest device we still render the full scene on
 * (a mid-range phone at the 'low' quality tier).
 */

/*
  Two builders, where there were nineteen. The rest belonged to the balance
  scale and the signet — scenes that have been retired — and importing them
  here would have kept this gate printing a confident triangle budget for
  models that never reach a screen.
*/
import {
  goldMassGeometry,
  weighPlatformGeometry,
} from '../src/components/webgl/geometry.ts';
import * as THREE from 'three';

const tris = (geo) => {
  const g = typeof geo === 'function' ? geo() : geo;
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3;
};

/*
  WHAT THIS MEASURED BEFORE, AND WHY IT HAD TO CHANGE.

  Two tables lived here: HERO / FINALE (every part of the procedural balance
  scale) and ASSAY (the signet ring). Both scenes were retired when the owner
  reviewed them on a real window and called them unreal items, and the
  persistent world took over the job they were doing.

  The gate kept passing afterwards, and that was the problem: it printed a
  confident triangle budget for geometry that no longer reaches a screen. A
  gate measuring deleted work is not neutral, it is a false reassurance — the
  same class of fault as the stale-build screenshots and the a11y check that
  hard-coded a base path, both recorded elsewhere in this directory.

  So it measures what ships now, which is one thing: the world.
*/

/** [label, triangles, instanceCount, drawCalls] */
const WORLD = [
  ['gold mass', tris(goldMassGeometry), 1, 1],
  ['weigh platform', tris(weighPlatformGeometry), 1, 1],
  /* The room the mass reflects. More segments than a shell needs
     geometrically, but it is what the environment samples and a coarse one
     bands visibly in the gradient behind the object. */
  ['room shell', tris(new THREE.SphereGeometry(1, 48, 32)), 1, 1],
  /* Dust is a single points draw whatever the count. The figure is the high
     tier's; lib/capability gives lower tiers fewer. */
  ['dust motes (points, high tier)', 0, 260, 1],
];

const report = (name, rows, budget) => {
  const total = rows.reduce((s, r) => s + r[1], 0);
  const calls = rows.reduce((s, r) => s + r[3], 0);

  console.log(`\n── ${name}`);
  rows
    .slice()
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, t, , c]) =>
      console.log(`   ${String(Math.round(t)).padStart(7)} tris  ${String(c).padStart(2)} calls  ${label}`),
    );
  console.log(`   ${'-'.repeat(52)}`);
  console.log(`   ${String(Math.round(total)).padStart(7)} tris  ${String(calls).padStart(2)} calls  TOTAL`);

  const ok = total <= budget.tris && calls <= budget.calls;
  console.log(
    `   ${ok ? 'WITHIN' : 'OVER'} BUDGET (${budget.tris.toLocaleString()} tris / ${budget.calls} draw calls)`,
  );
  return ok;
};

console.log('\nSCENE BUDGET — procedural geometry, measured not estimated');

/*
  TIGHTER THAN THE OLD BUDGET (60k against 150k), deliberately. The retired
  scenes were windowed: they drew inside a section, only while that section
  was near the viewport. The world is fixed behind the whole document and
  draws for the life of the page, so its geometry is paid for continuously.
  Measured cost of having it at all: about ten frames of scroll smoothness
  (scripts/check-perf.mjs). There is no headroom here to spend casually.
*/
const worldOk = report('THE PERSISTENT WORLD', WORLD, { tris: 60_000, calls: 12 });

/* --- Texture memory ----------------------------------------------------- */
// Procedural canvas maps, uploaded as RGBA8. Mipmaps add ~33%.
/*
  Only maps something on screen actually samples. The hallmark normal, the
  ingot stamp and the graduations belonged to the signet and the balance and
  went with them; listing them would have overstated VRAM by ~3MB and, worse,
  implied those scenes were still around.
*/
const MAPS = [
  ['cast gold roughness', 512],
  ['cast gold normal', 512],
  ['dust sprite', 64],
];

const bytes = MAPS.reduce((s, [, size]) => s + size * size * 4 * 1.33, 0);
console.log(`\n── TEXTURES`);
MAPS.forEach(([n, s]) => console.log(`   ${String(s).padStart(4)}²  ${n}`));
console.log(`   ${'-'.repeat(52)}`);
console.log(`   ${(bytes / 1024 / 1024).toFixed(1)} MB VRAM (RGBA8 + mipmaps), 0 bytes downloaded`);
// The environment is a 256px cubemap render target: 6 faces, half-float RGBA.
console.log(`   + ${((256 * 256 * 8 * 6) / 1024 / 1024).toFixed(1)} MB environment cubemap (256², RGBA16F)`);

console.log('');
process.exit(worldOk ? 0 : 1);
