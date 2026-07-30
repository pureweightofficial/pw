/**
 * Generates the tileable craquelure texture used to crack the display type.
 *
 * The 3D scale already carries this pattern as a normal map generated in the
 * browser (see src/components/webgl/textures.ts). CSS cannot run that, and text
 * needs an actual image to clip, so the same algorithm is run here at build time
 * and written out as a PNG.
 *
 * Same maths, same look: a Voronoi edge field. Scatter seeds on a jittered grid,
 * then for each pixel take the difference between the nearest and second-nearest
 * seed distance. That difference reaches zero exactly along cell boundaries —
 * which is where lacquer actually cracks — so the result is a closed-celled
 * organic network rather than the random noise a turbulence filter gives.
 *
 * Distances are toroidal, so the output tiles seamlessly.
 *
 *   node scripts/make-craquelure.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 512;
const CELLS = 11; // fewer, larger cells than the 3D map — these must read at type scale
const RADIUS = 2; // cells to search; 2 is provably exact for jitter under one cell

/* --- deterministic jitter, matching textures.ts ------------------------- */
function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

const seeds = new Float32Array(CELLS * CELLS * 2);
for (let gy = 0; gy < CELLS; gy += 1) {
  for (let gx = 0; gx < CELLS; gx += 1) {
    const k = (gy * CELLS + gx) * 2;
    seeds[k] = ((gx + hash2(gx, gy, 71)) / CELLS) * SIZE;
    seeds[k + 1] = ((gy + hash2(gx, gy, 137)) / CELLS) * SIZE;
  }
}

/* --- the field ---------------------------------------------------------- */
const cell = SIZE / CELLS;
// One filter byte (0 = none) per scanline, then one grey byte per pixel.
const raw = Buffer.alloc((SIZE + 1) * SIZE);

for (let y = 0; y < SIZE; y += 1) {
  const rowStart = y * (SIZE + 1);
  raw[rowStart] = 0;
  const cy = Math.floor(y / cell);

  for (let x = 0; x < SIZE; x += 1) {
    const cx = Math.floor(x / cell);
    let d1 = Infinity;
    let d2 = Infinity;

    for (let oy = -RADIUS; oy <= RADIUS; oy += 1) {
      const gy = (((cy + oy) % CELLS) + CELLS) % CELLS;
      for (let ox = -RADIUS; ox <= RADIUS; ox += 1) {
        const gx = (((cx + ox) % CELLS) + CELLS) % CELLS;
        const k = (gy * CELLS + gx) * 2;

        let dx = Math.abs(seeds[k] - x);
        let dy = Math.abs(seeds[k + 1] - y);
        if (dx > SIZE / 2) dx = SIZE - dx;
        if (dy > SIZE / 2) dy = SIZE - dy;
        const d = dx * dx + dy * dy;

        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }

    // 0 at a cell boundary, rising toward the centre.
    const edge = (Math.sqrt(d2) - Math.sqrt(d1)) / cell;
    // Narrow cracks. Higher exponent than the 3D map because a crack must stay
    // hairline relative to a letter stem, or it eats the glyph.
    const crack = Math.exp(-edge * edge * 90);

    // White plate, dark crack — and the crack floor is set by measurement, not
    // by eye. This texture multiplies the gold beneath it, so a deep crack
    // drags that gold toward black and takes its contrast with it. Measured
    // against the near-black ground, per gold stop:
    //
    //   floor  90  ->  1.53:1  every stop fails
    //   floor 150  ->  2.48:1  the darkest stop still fails
    //   floor 175  ->  3.05:1  ALL stops clear the 3:1 large-text threshold
    //   floor 200  ->  3.73:1  passes, but the crack is barely visible
    //
    // 175 is therefore the deepest crack this can carry and still be legible.
    const CRACK_FLOOR = 175;
    const v = 255 - crack * (255 - CRACK_FLOOR);
    raw[rowStart + 1 + x] = Math.max(0, Math.min(255, Math.round(v)));
  }
}

/* --- minimal greyscale PNG encoder -------------------------------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 0; // colour type 0 = greyscale
ihdr[10] = 0; // deflate
ihdr[11] = 0; // adaptive filtering
ihdr[12] = 0; // no interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = 'public/brand/craquelure.png';
writeFileSync(out, png);
console.log(`  ${out}  ${SIZE}x${SIZE} greyscale, ${(png.length / 1024).toFixed(1)} KB, tileable`);
