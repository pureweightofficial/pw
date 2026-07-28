import * as THREE from 'three';
import { mapSize } from './quality';

/**
 * PROCEDURAL SURFACE MAPS
 *
 * Every map the scale uses is generated in-browser from a 2D canvas. Nothing is
 * downloaded. That is a deliberate art-direction decision as much as a
 * performance one: stock gold textures are the single fastest way to make a
 * luxury site look cheap, and a bespoke scratch pattern that responds to our own
 * light rig reads as real metal in a way a tiled JPEG never does.
 *
 * The maps are memoised by key — the hero, assay and finale scenes all share one
 * set of GPU textures rather than generating three.
 */

const cache = new Map<string, THREE.Texture>();

function memo(key: string, build: () => THREE.Texture): THREE.Texture {
  // Resolution is part of the identity: the same map at 256 and 512 are
  // different GPU resources and must not share a cache slot.
  key = `${key}@${mapSize()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = build();
  cache.set(key, tex);
  return tex;
}

/** Disposes every generated texture. Called when the last scene unmounts. */
export function disposeTextures(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

/* -------------------------------------------------------------------------- */
/* DETERMINISTIC NOISE                                                        */
/* Seeded so a reload produces the identical surface — the object should feel  */
/* like one specific physical instrument, not a random one each visit.         */
/* -------------------------------------------------------------------------- */

function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Quintic fade — smoother second derivative than cosine, so large flat
  // surfaces do not show the grid of the noise lattice under raking light.
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

function fbm(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + i * 97);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.07; // non-integer, to avoid octaves aligning into visible bands
  }

  return value / norm;
}

/* -------------------------------------------------------------------------- */
/* HEIGHT -> NORMAL                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Sobel-converts a greyscale height canvas into a tangent-space normal map.
 * Run once per map at build time; a 512px map costs a few milliseconds.
 */
function heightToNormal(source: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const size = source.width;
  const srcCtx = source.getContext('2d', { willReadFrequently: true })!;
  const src = srcCtx.getImageData(0, 0, size, size).data;

  const [out, outCtx] = makeCanvas(size);
  const dst = outCtx.createImageData(size, size);

  // Wrapping sample keeps the normal map seamless when tiled.
  const at = (x: number, y: number): number => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);

      const dx = tl + 2 * l + bl - (tr + 2 * r + br);
      const dy = tl + 2 * t + tr - (bl + 2 * b + br);
      const dz = 1 / Math.max(0.0001, strength);

      const len = Math.hypot(dx, dy, dz) || 1;
      const i = (y * size + x) * 4;

      dst.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      dst.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      dst.data[i + 2] = ((dz / len) * 0.5 + 0.5) * 255;
      dst.data[i + 3] = 255;
    }
  }

  outCtx.putImageData(dst, 0, 0);
  return out;
}

function toTexture(
  canvas: HTMLCanvasElement,
  { srgb = false, repeat = 1 }: { srgb?: boolean; repeat?: number } = {},
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/* MAPS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Roughness map for polished gold: a lightly cloudy base with fine directional
 * hand-polish scratches. The scratches are what make a highlight *travel* across
 * the surface instead of sitting on it as a static blob.
 */
export function goldRoughnessMap(): THREE.Texture {
  return memo('gold-rough', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    // Base: mostly smooth, with slow variation so no two areas are identical.
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const n = fbm(x / 68, y / 68, 4, 11);
        // 0.13 -> 0.34 roughness: polished, not mirror.
        const v = (0.13 + n * 0.21) * 255;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Hand-polish scratches, biased to one direction as a real buffed surface is.
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 420; i += 1) {
      const x = hash2(i, 3, 5) * size;
      const y = hash2(i, 7, 9) * size;
      const len = 14 + hash2(i, 11, 13) * 96;
      const angle = -0.36 + (hash2(i, 17, 19) - 0.5) * 0.5;
      const alpha = 0.018 + hash2(i, 23, 29) * 0.05;

      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 0.5 + hash2(i, 31, 37) * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    return toTexture(canvas, { repeat: 2 });
  });
}

/**
 * Roughness map for forged iron: coarse, hammered, with dark oxidised pitting.
 * Much rougher range than gold — this contrast is what separates the two metals
 * even when they are lit identically.
 */
export function ironRoughnessMap(): THREE.Texture {
  return memo('iron-rough', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);
    const img = ctx.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        // Two scales of noise: broad forging undulation + fine tooth.
        const broad = fbm(x / 90, y / 90, 3, 41);
        const fine = fbm(x / 11, y / 11, 2, 73);
        // Pitting: sparse dark cells that read as oxidation in recesses.
        const pit = Math.pow(fbm(x / 26, y / 26, 2, 131), 3.2);

        const v = (0.44 + broad * 0.22 + fine * 0.1 + pit * 0.3) * 255;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, v);
        img.data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return toTexture(canvas, { repeat: 3 });
  });
}

/** Matching normal map for forged iron — hammer facets, not bumps. */
export function ironNormalMap(): THREE.Texture {
  return memo('iron-normal', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);
    const img = ctx.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const hammer = fbm(x / 42, y / 42, 3, 211);
        const tooth = fbm(x / 8, y / 8, 2, 307) * 0.28;
        const v = (hammer * 0.72 + tooth) * 255;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    return toTexture(heightToNormal(canvas, 2.4), { repeat: 3 });
  });
}

/**
 * Engraved ornament — the filigree band that runs around the plinth, the pan
 * rims and the beam. Drawn as real strokes rather than noise, because ornament
 * has to look *authored*: repeating motifs, mirrored pairs, consistent weight.
 */
export function engravingNormalMap(): THREE.Texture {
  return memo('engraving-normal', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    const motifs = 8;
    const cell = size / motifs;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let m = 0; m < motifs; m += 1) {
      const cx = m * cell + cell / 2;
      const cy = size / 2;

      // A mirrored scroll pair — the core filigree motif, repeated around the
      // band. Cut lines are dark (recessed); their shoulders are light.
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(dir, 1);

        // Recessed cut.
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = cell * 0.075;
        ctx.beginPath();
        ctx.moveTo(0, cell * 0.34);
        ctx.bezierCurveTo(cell * 0.16, cell * 0.2, cell * 0.3, cell * 0.02, cell * 0.24, -cell * 0.16);
        ctx.bezierCurveTo(cell * 0.19, -cell * 0.3, cell * 0.04, -cell * 0.28, cell * 0.07, -cell * 0.13);
        ctx.stroke();

        // Raised shoulder, offset by a pixel — this is what catches the key light.
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = cell * 0.03;
        ctx.beginPath();
        ctx.moveTo(-1.5, cell * 0.34);
        ctx.bezierCurveTo(cell * 0.16 - 1.5, cell * 0.2, cell * 0.3 - 1.5, cell * 0.02, cell * 0.24 - 1.5, -cell * 0.16);
        ctx.stroke();

        ctx.restore();
      }

      // Central bead between each scroll pair.
      ctx.fillStyle = '#b4b4b4';
      ctx.beginPath();
      ctx.arc(cx, cy - cell * 0.02, cell * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath();
      ctx.arc(cx, cy + cell * 0.01, cell * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    // Framing rules top and bottom of the band.
    ctx.strokeStyle = '#303030';
    ctx.lineWidth = 3;
    for (const y of [size * 0.2, size * 0.8]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    return toTexture(heightToNormal(canvas, 1.7));
  });
}

/**
 * CRAQUELURE — the cracked-lacquer texture from the supplied logo.
 *
 * The logo's most identifying material feature is not its colour, it is the
 * fine crazed network running through every gold surface — the letterforms, the
 * column, the frame. Putting it on the 3D instrument is what makes the scale
 * read as the *same object* as the mark rather than a gold thing standing next
 * to it.
 *
 * Built as a Voronoi edge field: scatter seed points, then for each pixel take
 * the difference between the nearest and second-nearest seed distance. That
 * difference approaches zero exactly along cell boundaries — which is precisely
 * where lacquer cracks — so the result is organic and closed-celled rather than
 * the random scratches a noise function gives.
 */
export function craquelureNormalMap(): THREE.Texture {
  return memo('craquelure-normal', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    // Seeds on a jittered grid. Pure randomness clumps, and clumping reads as
    // damage rather than as an evenly crazed finish.
    //
    // The grid is also what makes this affordable. Because jitter is confined
    // to [0,1) of a cell, every seed stays inside its own cell — so the nearest
    // and second-nearest seed to any pixel must lie within two cells of it.
    // Testing that 5x5 neighbourhood instead of all 196 seeds is the difference
    // between ~390ms of blocking work at scene mount and a few tens of ms.
    const cells = 14;
    const seeds = new Float32Array(cells * cells * 2);
    for (let gy = 0; gy < cells; gy += 1) {
      for (let gx = 0; gx < cells; gx += 1) {
        const k = (gy * cells + gx) * 2;
        seeds[k] = ((gx + hash2(gx, gy, 71)) / cells) * size;
        seeds[k + 1] = ((gy + hash2(gx, gy, 137)) / cells) * size;
      }
    }

    const img = ctx.createImageData(size, size);
    const cell = size / cells;
    const RADIUS = 2; // cells; covers nearest and second-nearest with margin

    for (let y = 0; y < size; y += 1) {
      const cy = Math.floor(y / cell);

      for (let x = 0; x < size; x += 1) {
        const cx = Math.floor(x / cell);
        let d1 = Infinity;
        let d2 = Infinity;

        for (let oy = -RADIUS; oy <= RADIUS; oy += 1) {
          // Wrap the cell index, keeping the map seamless when tiled.
          const gy = (((cy + oy) % cells) + cells) % cells;

          for (let ox = -RADIUS; ox <= RADIUS; ox += 1) {
            const gx = (((cx + ox) % cells) + cells) % cells;
            const k = (gy * cells + gx) * 2;

            // Toroidal distance, so seeds across the seam still compete.
            let dx = Math.abs(seeds[k] - x);
            let dy = Math.abs(seeds[k + 1] - y);
            if (dx > size / 2) dx = size - dx;
            if (dy > size / 2) dy = size - dy;
            const d = dx * dx + dy * dy;

            if (d < d1) {
              d2 = d1;
              d1 = d;
            } else if (d < d2) {
              d2 = d;
            }
          }
        }

        // 0 at a cell boundary, rising toward the cell centre.
        const edge = (Math.sqrt(d2) - Math.sqrt(d1)) / cell;
        // Narrow cracks with a soft shoulder either side.
        const crack = Math.exp(-edge * edge * 26);
        // Tooth inside each plate, so cells are not glassy-flat.
        const tooth = fbm(x / 24, y / 24, 2, 907) * 0.12;

        const v = (1 - crack) * 0.82 + tooth;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255));
        img.data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    return toTexture(heightToNormal(canvas, 2.1), { repeat: 2 });
  });
}

/**
 * A soft round sprite for ambient dust. Additive, so the centre is bright and
 * the falloff must reach true zero or the particles show as squares.
 */
export function dustSprite(): THREE.Texture {
  return memo('dust', () => {
    const size = 64;
    const [canvas, ctx] = makeCanvas(size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,240,210,1)');
    g.addColorStop(0.28, 'rgba(255,229,178,0.55)');
    g.addColorStop(1, 'rgba(255,220,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * The engraved graduation arc the pointer reads against. Ticks are drawn to
 * exact positions so the needle genuinely lines up with the centre mark when
 * the scale reaches balance — the moment only lands if it is actually accurate.
 */
export function graduationMap(): THREE.Texture {
  return memo('graduations', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size * 0.14;
    const radius = size * 0.72;
    const spread = Math.PI * 0.185;

    // Minor ticks.
    for (let i = -10; i <= 10; i += 1) {
      const t = i / 10;
      const angle = Math.PI / 2 + t * spread;
      const major = i % 5 === 0;
      const inner = radius - (major ? size * 0.075 : size * 0.042);

      ctx.strokeStyle = major ? 'rgba(255,233,168,0.92)' : 'rgba(215,168,61,0.5)';
      ctx.lineWidth = major ? 3.4 : 1.7;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }

    // The zero mark, struck heavier than the rest.
    ctx.strokeStyle = 'rgba(255,246,223,1)';
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy + radius - size * 0.105);
    ctx.lineTo(cx, cy + radius + size * 0.012);
    ctx.stroke();

    // Arc rule joining the ticks.
    ctx.strokeStyle = 'rgba(185,130,32,0.44)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI / 2 - spread, Math.PI / 2 + spread);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * A struck fineness mark for the assay section's signet.
 *
 * Deliberately limited to a millesimal fineness numeral inside a plain lozenge.
 * 916 is the standard fineness figure for 22 carat and is generic across the
 * trade — unlike an assay office mark, a sponsor's mark or a date letter, all of
 * which identify a specific real body and would be a fabrication to invent.
 */
export function hallmarkNormalMap(): THREE.Texture {
  return memo('hallmark-normal', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Worn field: a struck mark sits in metal that has been handled for years.
    const img = ctx.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const n = fbm(x / 30, y / 30, 3, 401);
        const i = (y * size + x) * 4;
        const v = 128 + (n - 0.5) * 26;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      }
    }
    ctx.putImageData(img, 0, 0);

    const cx = size / 2;
    const cy = size / 2;

    // The lozenge surround, struck into the surface.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#3c3c3c';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3, size * 0.19, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#bcbcbc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(-2, -2, size * 0.3, size * 0.19, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 118px "Times New Roman", serif';

    ctx.fillStyle = '#3a3a3a';
    ctx.fillText('916', cx, cy + 4);
    ctx.fillStyle = '#c4c4c4';
    ctx.fillText('916', cx - 3, cy + 1);
    ctx.fillStyle = '#454545';
    ctx.fillText('916', cx, cy + 4);

    return toTexture(heightToNormal(canvas, 1.05));
  });
}

/**
 * Refiner markings struck into the face of a bullion bar. Kept deliberately
 * generic — weight and fineness marks only, no invented refiner name, assay
 * office or serial that could be mistaken for a real certificated bar.
 */
export function ingotStampMap(): THREE.Texture {
  return memo('ingot-stamp', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const struck = (text: string, y: number, px: number, weight = 600) => {
      ctx.font = `${weight} ${px}px "Times New Roman", serif`;
      // Shadow side of the strike.
      ctx.fillStyle = '#3d3d3d';
      ctx.fillText(text, size / 2, y);
      // Lit shoulder, offset up-left toward the key light.
      ctx.fillStyle = '#b0b0b0';
      ctx.fillText(text, size / 2 - 1.5, y - 1.5);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillText(text, size / 2, y);
    };

    struck('FINE GOLD', size * 0.36, 46);
    struck('999.9', size * 0.52, 68, 700);

    // Struck rule between the marks.
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(size * 0.26, size * 0.44);
    ctx.lineTo(size * 0.74, size * 0.44);
    ctx.stroke();

    // Border cartouche.
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 4;
    ctx.strokeRect(size * 0.11, size * 0.2, size * 0.78, size * 0.52);

    return toTexture(heightToNormal(canvas, 1.25));
  });
}
