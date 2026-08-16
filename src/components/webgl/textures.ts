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
/* THE ROOM — an equirectangular studio, painted rather than assembled         */
/* -------------------------------------------------------------------------- */

/**
 * WHY A PAINTED ROOM AND NOT A SET OF LIGHT PANELS.
 *
 * A metal at metalness 1 shows you the room, not itself. The world's first rig
 * built that room out of drei `<Lightformer form="rect">` planes floating in
 * `#050505`, and it rendered exactly what that description predicts: a black
 * object with a handful of flat, hard-edged, uniformly-filled patches on it —
 * the rectangles, mirrored. Independent reviewers read them as "camouflage
 * print". They were never geometry. A MeshNormalMaterial pass over the same
 * mesh comes back as one continuous, perfectly smooth surface.
 *
 * Two properties of that rig caused it, and both are fixed here:
 *
 *  1. THE PANELS HAD EDGES. A rect emitter is a step function — full radiance
 *     inside, near-zero outside. Mirrored by anything, it stays a step. Every
 *     emitter in this map is a radial gradient with a long feathered tail, so
 *     there is no edge anywhere in the environment to mirror.
 *
 *  2. THE ROOM WAS BLACK BETWEEN THEM. With nothing to reflect in 95% of
 *     directions, the surface between the highlights had no tone at all, so the
 *     highlights read as separate objects floating on black rather than as the
 *     bright end of a continuous range. Here every direction returns something:
 *     a graded shell that runs from a cool skylight at the zenith, through a
 *     lifted warm horizon, down to a dark floor.
 *
 * The canvas is LDR by construction (0..1). Radiance above 1 — which is what
 * makes a highlight a highlight rather than a grey patch — comes from the
 * `color` multiplier on the basic material that carries it, applied inside a
 * half-float cube target with tone mapping off. See WorldLighting.
 */
export function studioEnvMap(): THREE.Texture {
  return memo('studio-env', () => {
    const W = 1024;
    const H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas context unavailable');

    /*
      THE SHELL. v=0 at the top of the canvas is the zenith (three's sphere UVs
      put v=1 at +Y and CanvasTexture flips Y, so canvas row 0 lands overhead).

      Deliberately dark. This is the tone the *unlit* side of the mass gets, and
      the brief asks for gold emerging from darkness — but "dark" has to mean a
      low value, not the absence of one. Pure black here is what made the object
      vanish into the page and left only its highlights visible.
    */
    const shell = ctx.createLinearGradient(0, 0, 0, H);
    shell.addColorStop(0.0, '#20242c'); // zenith: cool, like a skylight
    shell.addColorStop(0.28, '#1b1d22');
    shell.addColorStop(0.46, '#2a2620'); // the horizon warms
    shell.addColorStop(0.52, '#332c22'); // …and lifts: a cyc wall catching light
    shell.addColorStop(0.62, '#1a1611');
    shell.addColorStop(0.82, '#0b0a08');
    shell.addColorStop(1.0, '#060505'); // nadir: the floor takes light from nothing
    ctx.fillStyle = shell;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';

    /**
     * A soft emitter. `createRadialGradient` with a single stop pair falls off
     * linearly and still shows a discernible rim; these stops trace a
     * smootherstep so the tail runs all the way to zero with no visible
     * boundary at any exposure. Drawn three times so it wraps in azimuth.
     */
    const bloom = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      peak: number,
      rgb: [number, number, number],
    ) => {
      for (const off of [-W, 0, W]) {
        ctx.save();
        ctx.translate(cx + off, cy);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        for (let i = 0; i <= 12; i += 1) {
          const t = i / 12;
          const s = 1 - t * t * t * (t * (t * 6 - 15) + 10); // 1 -> 0, flat ends
          g.addColorStop(t, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(peak * s).toFixed(4)})`);
        }
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      }
    };

    /*
      KEY. Large, high, front-left, near-neutral. Neutral matters: a warm key on
      a warm metal is how a render turns into candy orange. Gold is allowed to
      do its own tinting — its albedo IS the specular colour — so the room feeds
      it white and lets the metal decide how yellow the answer is.
    */
    bloom(212, 118, 300, 210, 0.92, [255, 250, 242]);
    bloom(212, 118, 120, 96, 0.72, [255, 253, 250]); // hotter core, still feathered

    /*
      RIM. Behind and to the right, narrow-ish, warm. The one line of light that
      separates the mass from the dark behind it.
    */
    bloom(742, 214, 190, 96, 0.95, [255, 226, 184]);

    /*
      COOL FILL, low and front-right. Keeps the shadow side a *plane* rather
      than a hole, and its temperature difference from the key is most of what
      stops the frame reading as one flat wash of amber.
    */
    bloom(560, 372, 300, 150, 0.4, [150, 176, 214]);

    /*
      REFLECTION CARDS. Tall soft columns, never seen directly. On a curved
      metal these become the long vertical gradients that say "photographed in a
      studio". Soft-edged on purpose — the hard-edged version of exactly this
      idea is what produced the plates.
    */
    bloom(900, 268, 62, 260, 0.5, [232, 224, 208]);
    bloom(40, 250, 54, 230, 0.34, [214, 216, 224]);

    /* A wide, very low horizon lift: the room has a far wall. */
    bloom(500, 250, 520, 62, 0.3, [186, 158, 118]);

    ctx.globalCompositeOperation = 'source-over';

    /*
      MOTTLE. A real room is not a clean gradient — it has unevenness, and a
      perfectly clean environment is a large part of why CG metal reads as CG.
      Multiplicative, shallow, and low-frequency enough never to alias.
    */
    const img = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const m = 0.9 + fbm(x / 96, y / 96, 3, 61) * 0.2;
        const i = (y * W + x) * 4;
        img.data[i] = Math.min(255, img.data[i] * m);
        img.data[i + 1] = Math.min(255, img.data[i + 1] * m);
        img.data[i + 2] = Math.min(255, img.data[i + 2] * m);
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  });
}

/* -------------------------------------------------------------------------- */
/* MAPS                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * ROUGHNESS FOR THE CAST MASS — and the number that mattered most.
 *
 * `goldRoughnessMap` returns 0.13–0.34, and three MULTIPLIES a roughness map
 * into `material.roughness`. The mass was set to roughness 0.26, so its real
 * roughness was 0.26 × 0.13…0.34 = **0.034 to 0.088**. That is not "polished
 * bullion", that is a mirror; and a mirror in a room made of hard-edged panels
 * returns hard-edged panels. No amount of geometry work can fix a mirror.
 *
 * So this map is built for the opposite job: it sits high (0.60–1.0) and
 * *varies*, and the material's base roughness does the scaling. The variation is
 * the point — a constant roughness gives one clean highlight sliding over the
 * surface like a lit balloon, which is the plastic look. Rougher cast skin,
 * smoother where a face has been handled, and fine porosity throughout.
 */
export function castGoldRoughnessMap(): THREE.Texture {
  return memo('cast-gold-rough', () => {
    const size = mapSize();
    const [canvas, ctx] = makeCanvas(size);
    const img = ctx.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        // Broad zones: where the skin is raw, where it has been rubbed.
        const broad = fbm(x / 110, y / 110, 3, 41);
        // Fine porosity — the flecked glitter of a cast surface.
        const fine = fbm(x / 13, y / 13, 3, 43);
        let v = 0.6 + broad * 0.34 + (fine - 0.5) * 0.14;
        v = Math.max(0.42, Math.min(1, v));

        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Burnished passes: narrow smoother streaks where the mass has been
    // handled. These are what let a highlight *travel* rather than sit.
    ctx.globalCompositeOperation = 'darken';
    ctx.lineCap = 'round';
    for (let i = 0; i < 90; i += 1) {
      const x = hash2(i, 5, 71) * size;
      const y = hash2(i, 9, 73) * size;
      const len = size * (0.05 + hash2(i, 13, 79) * 0.22);
      const angle = -0.5 + (hash2(i, 17, 83) - 0.5) * 1.1;
      const v = Math.round((0.4 + hash2(i, 19, 89) * 0.16) * 255);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 2 + hash2(i, 23, 97) * 9;
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
 * NORMAL MAP FOR THE CAST MASS.
 *
 * Detail this fine belongs in a normal map, not in vertices: it is what breaks
 * one large specular reflection into the flecked, restless surface real cast
 * metal has, and it costs nothing in the triangle budget. Three things are
 * layered — the slow undulation of metal that cooled unevenly, the shrinkage
 * dimples it cools *into*, and a fine grain over the whole of it.
 */
export function castGoldNormalMap(): THREE.Texture {
  return memo('cast-gold-normal', () => {
    const size = mapSize();
    const [height, hctx] = makeCanvas(size);
    const img = hctx.createImageData(size, size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const slow = fbm(x / 78, y / 78, 3, 101);
        const grain = fbm(x / 9, y / 9, 3, 103);
        const v = 0.5 + (slow - 0.5) * 0.72 + (grain - 0.5) * 0.3;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] =
          Math.max(0, Math.min(255, v * 255));
        img.data[i + 3] = 255;
      }
    }
    hctx.putImageData(img, 0, 0);

    // Shrinkage dimples. Drawn wrapped so the map still tiles.
    hctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 150; i += 1) {
      const cx = hash2(i, 3, 211) * size;
      const cy = hash2(i, 7, 223) * size;
      const r = size * (0.008 + hash2(i, 11, 227) * 0.035);
      const depth = 0.5 + hash2(i, 13, 229) * 0.35;
      for (const [ox, oy] of [
        [0, 0], [-size, 0], [size, 0], [0, -size], [0, size],
      ]) {
        const g = hctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
        g.addColorStop(0, `rgba(0,0,0,${(1 - depth).toFixed(3)})`);
        g.addColorStop(0.55, `rgba(90,90,90,${((1 - depth) * 0.5).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        hctx.fillStyle = g;
        hctx.beginPath();
        hctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
        hctx.fill();
      }
    }
    hctx.globalCompositeOperation = 'source-over';

    return toTexture(heightToNormal(height, 1.9), { repeat: 3 });
  });
}

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
