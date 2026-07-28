/**
 * Spatial audit of the balance scale.
 *
 * I cannot see the render, so instead of guessing I load the real geometry and
 * measure it: does any part intersect another, does the pointer actually reach
 * the graduations, do the pans clear the plinth. Clipping is the single most
 * common way a procedurally-built model looks broken.
 */
import {
  plinthGeometry,
  columnGeometry,
  beamGeometry,
  fulcrumGeometry,
  pointerGeometry,
  panGeometry,
  ingotGeometry,
  sealBlockGeometry,
  graduationPlateGeometry,
} from '../src/components/webgl/geometry.ts';

const box = (g) => {
  g.computeBoundingBox();
  return g.boundingBox;
};

const f = (n) => n.toFixed(4).padStart(9);

/** Max radial extent of a lathe geometry within a world-Y window. */
function maxRadiusInRange(geo, baseY, yMin, yMax) {
  const pos = geo.attributes.position;
  let max = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) + baseY;
    if (y < yMin || y > yMax) continue;
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (r > max) max = r;
  }
  return max;
}

const PIVOT_Y = 1.86;
const BEAM_HALF = 1.62;
const HANGER_DROP = 0.62;
const COLUMN_BASE_Y = 0.3;

/* ---- Configuration under test (mirrors BalanceScale.tsx) ---------------- */
const GRAD_GROUP_Z = Number(process.argv[2] ?? 0.26);
const GRAD_FACE_LOCAL_Z = Number(process.argv[3] ?? 0.028);
const POINTER_Z = Number(process.argv[4] ?? 0.31);

console.log(`\nTesting: gradGroupZ=${GRAD_GROUP_Z}  faceZ=+${GRAD_FACE_LOCAL_Z}  pointerZ=${POINTER_Z}\n`);

const plinth = box(plinthGeometry());
const column = box(columnGeometry());
const beam = box(beamGeometry(BEAM_HALF));
const fulcrum = box(fulcrumGeometry());
const pointer = box(pointerGeometry());
const pan = box(panGeometry(0.54));
const ingot = box(ingotGeometry());
const seal = box(sealBlockGeometry());
const plate = box(graduationPlateGeometry());

console.log('PART                      minY      maxY     maxRadius/X');
console.log('plinth              ', f(plinth.min.y), f(plinth.max.y), f(plinth.max.x));
console.log('column (local)      ', f(column.min.y), f(column.max.y), f(column.max.x));
console.log('beam (centred)      ', f(beam.min.y), f(beam.max.y), f(beam.max.x));
console.log('fulcrum (centred)   ', f(fulcrum.min.y), f(fulcrum.max.y), f(fulcrum.max.x));
console.log('pointer             ', f(pointer.min.y), f(pointer.max.y), f(pointer.max.z));
console.log('pan                 ', f(pan.min.y), f(pan.max.y), f(pan.max.x));
console.log('ingot               ', f(ingot.min.y), f(ingot.max.y), f(ingot.max.x));
console.log('seal block          ', f(seal.min.y), f(seal.max.y), f(seal.max.x));
console.log('graduation plate    ', f(plate.min.y), f(plate.max.y), f(plate.max.z));

const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

/* 1. Column seats on the plinth ---------------------------------------- */
const columnTopWorld = COLUMN_BASE_Y + column.max.y;
check(
  'column seats on plinth (no gap)',
  COLUMN_BASE_Y <= plinth.max.y + 0.001,
  `columnBase=${COLUMN_BASE_Y} plinthTop=${plinth.max.y.toFixed(3)}`,
);

/* 2. Fulcrum apex meets the beam pivot ---------------------------------- */
const fulcrumApex = PIVOT_Y - 0.07 + fulcrum.max.y;
check(
  'fulcrum apex meets pivot',
  Math.abs(fulcrumApex - PIVOT_Y) < 0.01,
  `apex=${fulcrumApex.toFixed(4)} pivot=${PIVOT_Y}`,
);
check(
  'fulcrum overlaps column top (seated, not floating)',
  PIVOT_Y - 0.07 + fulcrum.min.y <= columnTopWorld + 0.001,
  `fulcrumBase=${(PIVOT_Y - 0.07 + fulcrum.min.y).toFixed(4)} columnTop=${columnTopWorld.toFixed(4)}`,
);

/* 3. Graduation plate must clear the column ----------------------------- */
const plateYMin = PIVOT_Y + plate.min.y;
const plateYMax = PIVOT_Y + plate.max.y;
const plateZNear = GRAD_GROUP_Z + plate.min.z;
const columnRadiusAtPlate = maxRadiusInRange(columnGeometry(), COLUMN_BASE_Y, plateYMin, plateYMax);
check(
  'graduation plate clears column',
  plateZNear > columnRadiusAtPlate + 0.01,
  `plateNearZ=${plateZNear.toFixed(4)} columnR=${columnRadiusAtPlate.toFixed(4)} (over y ${plateYMin.toFixed(3)}..${plateYMax.toFixed(3)})`,
);

/* 4. Pointer must clear the column over its whole sweep ----------------- */
const pointerTipY = PIVOT_Y - 0.01 + pointer.min.y;
const pointerTopY = PIVOT_Y - 0.01 + pointer.max.y;
const columnRadiusAtPointer = maxRadiusInRange(columnGeometry(), COLUMN_BASE_Y, pointerTipY, pointerTopY);
check(
  'pointer clears column',
  POINTER_Z > columnRadiusAtPointer + 0.01,
  `pointerZ=${POINTER_Z} columnR=${columnRadiusAtPointer.toFixed(4)} (over y ${pointerTipY.toFixed(3)}..${pointerTopY.toFixed(3)})`,
);

/* 5. Pointer sits in front of the graduation face ----------------------- */
const faceZ = GRAD_GROUP_Z + GRAD_FACE_LOCAL_Z;
check(
  'pointer in front of graduation face',
  POINTER_Z > faceZ + 0.005,
  `pointerZ=${POINTER_Z} faceZ=${faceZ.toFixed(4)}`,
);

/* 6. Pointer tip reaches the graduation ticks --------------------------- */
// The tick arc sits at 0.72 * planeSize below the pivot; planeSize = 0.694.
const tickY = PIVOT_Y - 0.72 * 0.694;
check(
  'pointer tip reaches the tick arc',
  pointerTipY <= tickY + 0.005,
  `tipY=${pointerTipY.toFixed(4)} tickY=${tickY.toFixed(4)}`,
);
check(
  'pointer tip stays on the plate',
  pointerTipY >= plateYMin - 0.005,
  `tipY=${pointerTipY.toFixed(4)} plateBottom=${plateYMin.toFixed(4)}`,
);

/* 7. Pans hang clear of everything -------------------------------------- */
const panBaseY = PIVOT_Y - HANGER_DROP - 0.02;
check(
  'pan clears the plinth vertically',
  panBaseY > plinth.max.y + 0.2,
  `panBase=${panBaseY.toFixed(3)} plinthTop=${plinth.max.y.toFixed(3)}`,
);
check(
  'pan does not overlap the column horizontally',
  BEAM_HALF - pan.max.x > maxRadiusInRange(columnGeometry(), COLUMN_BASE_Y, 0.3, 1.8) + 0.05,
  `panInnerEdge=${(BEAM_HALF - pan.max.x).toFixed(3)}`,
);

/* 8. Cargo clears the underside of the beam ----------------------------- */
const cargoTopBullion = panBaseY + 0.026 + 0.066 + ingot.max.y;
const cargoTopSeal = panBaseY + 0.024 + 0.213;
const beamUnderside = PIVOT_Y + beam.min.y;
check(
  'bullion stack clears the beam',
  cargoTopBullion < beamUnderside - 0.05,
  `cargoTop=${cargoTopBullion.toFixed(3)} beamUnderside=${beamUnderside.toFixed(3)}`,
);
check(
  'seal block clears the beam',
  cargoTopSeal < beamUnderside - 0.05,
  `cargoTop=${cargoTopSeal.toFixed(3)} beamUnderside=${beamUnderside.toFixed(3)}`,
);

/* 9. Ingots fit inside the pan ------------------------------------------ */
check(
  'two ingots side by side fit in the pan',
  0.088 + ingot.max.x < 0.54 * 0.95,
  `halfSpan=${(0.088 + ingot.max.x).toFixed(3)} panInner=${(0.54 * 0.95).toFixed(3)}`,
);

/* ---- Report ------------------------------------------------------------ */
console.log('\nSPATIAL CHECKS');
let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name.padEnd(46)} ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} passed\n`);
process.exit(failed ? 1 : 0);
