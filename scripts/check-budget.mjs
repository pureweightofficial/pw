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

import {
  beamGeometry,
  chainLinkGeometry,
  columnGeometry,
  finialGeometry,
  fulcrumGeometry,
  graduationFaceGeometry,
  graduationPlateGeometry,
  ingotGeometry,
  panGeometry,
  plinthBandGeometry,
  plinthGeometry,
  pointerGeometry,
  sealBandGeometry,
  sealBlockGeometry,
  signetFaceGeometry,
  signetRingGeometry,
  stampPlaneGeometry,
  suspensionEyeGeometry,
} from '../src/components/webgl/geometry.ts';
import * as THREE from 'three';

const tris = (geo) => {
  const g = typeof geo === 'function' ? geo() : geo;
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3;
};

/** [label, triangles, instanceCount, drawCalls] */
const HERO = [
  ['plinth', tris(plinthGeometry), 1, 1],
  ['plinth band', tris(plinthBandGeometry), 1, 1],
  ['plinth reveal torus', tris(new THREE.TorusGeometry(0.6, 0.0085, 8, 72)), 1, 1],
  ['column', tris(columnGeometry), 1, 1],
  ['column collars (3)', tris(new THREE.TorusGeometry(0.236, 0.0125, 8, 48)) * 3, 1, 3],
  ['graduation plate', tris(graduationPlateGeometry), 1, 1],
  ['graduation face', tris(graduationFaceGeometry), 1, 1],
  ['plate bracket', tris(new THREE.BoxGeometry(0.052, 0.02, 0.16)), 1, 1],
  ['fulcrum', tris(fulcrumGeometry), 1, 1],
  ['beam', tris(beamGeometry), 1, 1],
  ['beam boss', tris(new THREE.TorusGeometry(0.072, 0.019, 10, 32)), 1, 1],
  ['finial', tris(finialGeometry), 1, 1],
  ['pointer + boss', tris(pointerGeometry) + tris(new THREE.CylinderGeometry(0.021, 0.021, 0.31, 16)), 1, 2],
  // --- per hanger, ×2 ---
  ['suspension eyes (2)', tris(suspensionEyeGeometry) * 2, 1, 2],
  ['chains (2 × 30 links, instanced)', tris(chainLinkGeometry) * 30 * 2, 60, 2],
  ['pans (2)', tris(panGeometry) * 2, 1, 2],
  ['pan rims (2)', tris(new THREE.CylinderGeometry(0.537, 0.537, 0.026, 64, 1, true)) * 2, 1, 2],
  ['bullion (3 bars + stamp)', tris(ingotGeometry) * 3 + tris(stampPlaneGeometry), 1, 4],
  ['seal block + bands + seal', tris(sealBlockGeometry) + tris(sealBandGeometry) * 2 + tris(new THREE.CylinderGeometry(0.052, 0.056, 0.016, 28)) + tris(new THREE.TorusGeometry(0.038, 0.005, 8, 28)), 1, 5],
];

const ASSAY = [
  ['signet ring', tris(signetRingGeometry), 1, 1],
  ['signet bezel', tris(signetFaceGeometry), 1, 1],
  ['caliper ring', tris(new THREE.TorusGeometry(0.78, 0.0035, 6, 128)), 1, 1],
  ['measurement ticks (instanced)', tris(new THREE.PlaneGeometry(0.012, 0.05)) * 48, 48, 1],
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

// A mid-range phone comfortably handles ~150k tris and ~100 draw calls at 60fps.
// We aim well under, because this runs behind text that must stay readable.
const heroOk = report('HERO / FINALE', HERO, { tris: 150_000, calls: 60 });
const assayOk = report('ASSAY', ASSAY, { tris: 60_000, calls: 20 });

/* --- Texture memory ----------------------------------------------------- */
// Procedural canvas maps, uploaded as RGBA8. Mipmaps add ~33%.
const MAPS = [
  ['gold roughness', 512],
  ['iron roughness', 512],
  ['iron normal', 512],
  ['engraving normal', 512],
  ['hallmark normal', 512],
  ['ingot stamp normal', 512],
  ['graduations', 512],
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
process.exit(heroOk && assayOk ? 0 : 1);
