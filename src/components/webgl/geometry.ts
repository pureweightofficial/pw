import * as THREE from 'three';

/**
 * PROCEDURAL GEOMETRY FOR THE BALANCE
 *
 * The instrument is built from turned profiles (LatheGeometry) and extruded
 * sculpted outlines (ExtrudeGeometry) rather than a downloaded model. That is
 * the right call here for three reasons:
 *
 *  1. Silhouette control. The logo's scale has a specific baluster column and a
 *     specific tapered beam; a stock model would have to be fought into shape.
 *  2. Weight. The whole instrument is a few hundred KB of vertices generated at
 *     runtime — no GLB, no DRACO decoder, no KTX2 transcoder to ship.
 *  3. Every edge is bevelled. Nothing sells "cast and finished by hand" like a
 *     chamfer catching the key light; nothing says "cartoon 3D" like a raw
 *     90-degree box edge.
 *
 * Geometries are memoised and shared across all three scenes.
 */

const cache = new Map<string, THREE.BufferGeometry>();

function memo(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  const hit = cache.get(key);
  if (hit) return hit;
  const geo = build();
  cache.set(key, geo);
  return geo;
}

export function disposeGeometry(): void {
  cache.forEach((g) => g.dispose());
  cache.clear();
}

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/* -------------------------------------------------------------------------- */
/* THE BASE — a stepped, weighted plinth                                      */
/* -------------------------------------------------------------------------- */

/**
 * Wide at the floor and stepped inward as it rises. Each step is a short
 * vertical face followed by a shallow chamfer, which gives the silhouette a
 * stack of thin horizontal highlights under a raking key light — the visual
 * signature of a heavy cast base.
 */
export function plinthGeometry(): THREE.BufferGeometry {
  return memo('plinth', () => {
    const profile = [
      v2(0.0, 0.0),
      v2(1.16, 0.0),
      v2(1.16, 0.038),
      v2(1.125, 0.062),
      v2(1.11, 0.078),
      v2(1.11, 0.108),
      v2(1.06, 0.132),
      v2(0.9, 0.148),
      v2(0.86, 0.166),
      v2(0.845, 0.196),
      v2(0.8, 0.216),
      v2(0.62, 0.232),
      v2(0.575, 0.252),
      v2(0.56, 0.278),
      v2(0.5, 0.296),
      v2(0.0, 0.302),
    ];
    const geo = new THREE.LatheGeometry(profile, 72);
    geo.computeVertexNormals();
    return geo;
  });
}

/** The ornamental band inlaid into the plinth's widest step. */
export function plinthBandGeometry(): THREE.BufferGeometry {
  return memo('plinth-band', () => new THREE.CylinderGeometry(1.135, 1.135, 0.03, 96, 1, true));
}

/* -------------------------------------------------------------------------- */
/* THE COLUMN — a turned baluster                                             */
/* -------------------------------------------------------------------------- */

/**
 * A classical turned profile: a swelling foot, a long tapering shaft, a collar,
 * and a narrow neck into the fulcrum. The subtle mid-shaft swell (entasis) is
 * what stops it reading as a plain cylinder.
 */
export function columnGeometry(): THREE.BufferGeometry {
  return memo('column', () => {
    const profile = [
      v2(0.0, 0.0),
      v2(0.34, 0.0),
      v2(0.34, 0.045),
      v2(0.3, 0.075),
      v2(0.255, 0.105),
      v2(0.238, 0.145),
      v2(0.222, 0.2),
      v2(0.2, 0.3),
      v2(0.183, 0.45),
      v2(0.176, 0.62),
      v2(0.178, 0.78), // entasis: the shaft swells almost imperceptibly
      v2(0.168, 0.94),
      v2(0.15, 1.06),
      v2(0.196, 1.1), // collar
      v2(0.206, 1.128),
      v2(0.196, 1.156),
      v2(0.142, 1.184),
      v2(0.118, 1.26),
      v2(0.126, 1.34),
      v2(0.104, 1.372),
      v2(0.088, 1.42),
      v2(0.0, 1.446),
    ];
    const geo = new THREE.LatheGeometry(profile, 64);
    geo.computeVertexNormals();
    return geo;
  });
}

/** The finial sitting above the fulcrum — a small turned cap and bead. */
export function finialGeometry(): THREE.BufferGeometry {
  return memo('finial', () => {
    const profile = [
      v2(0.0, 0.0),
      v2(0.086, 0.0),
      v2(0.094, 0.022),
      v2(0.078, 0.046),
      v2(0.056, 0.062),
      v2(0.074, 0.086),
      v2(0.062, 0.116),
      v2(0.034, 0.14),
      v2(0.016, 0.166),
      v2(0.0, 0.176),
    ];
    const geo = new THREE.LatheGeometry(profile, 40);
    geo.computeVertexNormals();
    return geo;
  });
}

/* -------------------------------------------------------------------------- */
/* THE BEAM — a sculpted, tapered arm                                         */
/* -------------------------------------------------------------------------- */

/**
 * Drawn as a closed outline of eight bezier segments: deepest at the fulcrum
 * where the load is, tapering to fine points at the suspension eyes. Extruded
 * with a bevel so both long edges carry a continuous highlight.
 */
export function beamGeometry(halfLength = 1.62): THREE.BufferGeometry {
  return memo(`beam-${halfLength}`, () => {
    const L = halfLength;
    const hEnd = 0.03;
    // 0.066, was 0.088: even three-quarter-on, the deeper lens face read as a
    // blade. Depth moves into the extrusion instead (below), so the beam keeps
    // its visual mass side-on without presenting a wide flat face.
    const hMid = 0.066;

    const shape = new THREE.Shape();
    shape.moveTo(-L, 0);
    shape.quadraticCurveTo(-L * 0.74, -hEnd * 1.25, -L * 0.36, -hMid * 0.6);
    shape.quadraticCurveTo(-L * 0.14, -hMid * 0.98, 0, -hMid);
    shape.quadraticCurveTo(L * 0.14, -hMid * 0.98, L * 0.36, -hMid * 0.6);
    shape.quadraticCurveTo(L * 0.74, -hEnd * 1.25, L, 0);
    shape.quadraticCurveTo(L * 0.74, hEnd * 1.25, L * 0.36, hMid * 0.6);
    shape.quadraticCurveTo(L * 0.14, hMid * 0.98, 0, hMid);
    shape.quadraticCurveTo(-L * 0.14, hMid * 0.98, -L * 0.36, hMid * 0.6);
    shape.quadraticCurveTo(-L * 0.74, hEnd * 1.25, -L, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.011,
      bevelSize: 0.011,
      bevelOffset: 0,
      bevelSegments: 3,
      curveSegments: 24,
    });

    geo.center();
    geo.computeVertexNormals();
    return geo;
  });
}

/** The knife-edge bearing block that the beam pivots on. */
export function fulcrumGeometry(): THREE.BufferGeometry {
  return memo('fulcrum', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.13, -0.055);
    shape.lineTo(0.13, -0.055);
    shape.lineTo(0.098, 0.032);
    shape.lineTo(0.0, 0.086);
    shape.lineTo(-0.098, 0.032);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  });
}

/** The pointer that reads against the graduation arc. */
export function pointerGeometry(): THREE.BufferGeometry {
  return memo('pointer', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.026, 0.05);
    shape.lineTo(0.026, 0.05);
    shape.lineTo(0.0075, -0.52);
    shape.lineTo(-0.0075, -0.52);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * The arc plate the pointer reads against — a ring segment centred on the beam
 * pivot, so the graduations sweep the exact path the pointer tip travels.
 */
export function graduationPlateGeometry(): THREE.BufferGeometry {
  return memo('graduation-plate', () => {
    const spread = Math.PI * 0.205;
    const rOuter = 0.565;
    const rInner = 0.418;
    const start = -Math.PI / 2 - spread;
    const end = -Math.PI / 2 + spread;
    const steps = 40;

    const shape = new THREE.Shape();
    for (let i = 0; i <= steps; i += 1) {
      const a = start + ((end - start) * i) / steps;
      const x = Math.cos(a) * rOuter;
      const y = Math.sin(a) * rOuter;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const a = start + ((end - start) * i) / steps;
      shape.lineTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
      curveSegments: 4,
    });
    geo.computeVertexNormals();
    return geo;
  });
}

/** The transparent overlay carrying the struck tick marks. */
export function graduationFaceGeometry(): THREE.BufferGeometry {
  return memo('graduation-face', () => new THREE.PlaneGeometry(0.694, 0.694));
}

/** The struck face applied to the top bar of the stack. */
export function stampPlaneGeometry(): THREE.BufferGeometry {
  return memo('stamp-plane', () => new THREE.PlaneGeometry(0.252, 0.14));
}

/*
  benchGeometry lived here — the 24x24 plane the hero instrument stood on. It
  went with HeroScene, its only consumer. See canvases.tsx for why the hero no
  longer carries a procedural scale.
*/

/* -------------------------------------------------------------------------- */
/* THE PANS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A shallow dish with a rolled rim, open on both sides. The rim is the detail
 * that matters: it gives a bright elliptical highlight that reads instantly as
 * a pan even when the dish itself is in shadow.
 */
export function panGeometry(radius = 0.54): THREE.BufferGeometry {
  return memo(`pan-${radius}`, () => {
    const r = radius;
    const profile = [
      v2(0.0, 0.0),
      v2(r * 0.36, 0.004),
      v2(r * 0.62, 0.016),
      v2(r * 0.82, 0.04),
      v2(r * 0.93, 0.072),
      v2(r * 0.985, 0.104),
      v2(r, 0.124), // rim crest
      v2(r * 0.975, 0.136),
      v2(r * 0.94, 0.124),
      v2(r * 0.9, 0.098),
      v2(r * 0.78, 0.06),
      v2(r * 0.56, 0.033),
      v2(r * 0.3, 0.02),
      v2(0.0, 0.016),
    ];
    const geo = new THREE.LatheGeometry(profile, 72);
    geo.computeVertexNormals();
    return geo;
  });
}

/** The three-armed yoke the pan hangs from. */
export function chainLinkGeometry(): THREE.BufferGeometry {
  return memo('chain-link', () => new THREE.TorusGeometry(0.019, 0.0052, 6, 14));
}

/** The suspension eye where a chain meets the beam. */
export function suspensionEyeGeometry(): THREE.BufferGeometry {
  return memo('eye', () => new THREE.TorusGeometry(0.034, 0.0105, 8, 20));
}

/* -------------------------------------------------------------------------- */
/* THE CARGO                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A cast bullion bar: rounded-rectangle footprint, chamfered edges, and the
 * characteristic draft angle from being knocked out of a mould. The taper is
 * applied per-vertex after extrusion.
 */
export function ingotGeometry(
  width = 0.34,
  depth = 0.19,
  height = 0.072,
): THREE.BufferGeometry {
  return memo(`ingot-${width}-${depth}-${height}`, () => {
    const w = width / 2;
    const d = depth / 2;
    const r = Math.min(w, d) * 0.16;

    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -d);
    shape.lineTo(w - r, -d);
    shape.quadraticCurveTo(w, -d, w, -d + r);
    shape.lineTo(w, d - r);
    shape.quadraticCurveTo(w, d, w - r, d);
    shape.lineTo(-w + r, d);
    shape.quadraticCurveTo(-w, d, -w, d - r);
    shape.lineTo(-w, -d + r);
    shape.quadraticCurveTo(-w, -d, -w + r, -d);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelThickness: height * 0.16,
      bevelSize: height * 0.14,
      bevelOffset: 0,
      bevelSegments: 2,
      curveSegments: 8,
    });

    // Extrusion runs along +Z; stand the bar up so height is +Y.
    geo.rotateX(-Math.PI / 2);
    geo.computeBoundingBox();

    const bounds = geo.boundingBox!;
    const minY = bounds.min.y;
    const spanY = Math.max(0.0001, bounds.max.y - minY);

    // Mould draft: 9% narrower at the top face than at the base.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      const t = (y - minY) / spanY;
      const scale = 1 - 0.09 * t;
      pos.setX(i, pos.getX(i) * scale);
      pos.setZ(i, pos.getZ(i) * scale);
    }
    pos.needsUpdate = true;

    geo.translate(0, -minY, 0); // sit the bar on y = 0
    geo.computeVertexNormals();
    return geo;
  });
}

/**
 * The counterweight side: a sealed valuation block, not cash.
 *
 * A brief deliberately called out that bundles of banknotes make the brand read
 * as a pawn shop. So the opposite pan carries an abstract representation of
 * settled value — a dense dark block, banded in gold, closed with a struck
 * seal. It is heavy, formal and completely free of currency signalling.
 */
export function sealBlockGeometry(): THREE.BufferGeometry {
  return memo('seal-block', () => {
    const w = 0.15;
    const d = 0.115;
    const h = 0.2;
    const r = 0.016;

    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -d);
    shape.lineTo(w - r, -d);
    shape.quadraticCurveTo(w, -d, w, -d + r);
    shape.lineTo(w, d - r);
    shape.quadraticCurveTo(w, d, w - r, d);
    shape.lineTo(-w + r, d);
    shape.quadraticCurveTo(-w, d, -w, d - r);
    shape.lineTo(-w, -d + r);
    shape.quadraticCurveTo(-w, -d, -w + r, -d);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.009,
      bevelSize: 0.009,
      bevelSegments: 2,
      curveSegments: 8,
    });

    geo.rotateX(-Math.PI / 2);
    geo.computeBoundingBox();
    geo.translate(0, -geo.boundingBox!.min.y, 0);
    geo.computeVertexNormals();
    return geo;
  });
}

/** The gold band wrapped around the seal block. */
export function sealBandGeometry(): THREE.BufferGeometry {
  return memo('seal-band', () => {
    const geo = new THREE.BoxGeometry(0.316, 0.03, 0.246);
    return geo;
  });
}

/* -------------------------------------------------------------------------- */
/* THE ASSAY SUBJECT — a signet ring for the purity section                    */
/* -------------------------------------------------------------------------- */

/**
 * A heavy signet band. Used in the Purity & Weight section because it carries
 * the two things that section is about: a hallmark face to magnify, and a
 * curved polished surface that shows how a highlight travels over real gold.
 */
export function signetRingGeometry(): THREE.BufferGeometry {
  return memo('signet', () => {
    const geo = new THREE.TorusGeometry(0.5, 0.13, 28, 96);

    // Flatten the band into a D-section: comfortable inside, domed outside.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const radial = Math.hypot(v.x, v.y);
      if (radial < 0.5) {
        // Inner half: pull toward a cylinder so the ring has a true bore.
        const k = 0.5 - radial;
        v.x += (v.x / (radial || 1)) * k * 0.42;
        v.y += (v.y / (radial || 1)) * k * 0.42;
      }
      v.z *= 0.72; // narrow the band
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  });
}

/** The flat bezel face of the signet, where the hallmark is struck. */
export function signetFaceGeometry(): THREE.BufferGeometry {
  return memo('signet-face', () => new THREE.CylinderGeometry(0.2, 0.225, 0.06, 40));
}

/* -------------------------------------------------------------------------- */
/* AMBIENT DUST                                                                */
/* -------------------------------------------------------------------------- */

/** Positions and per-particle randomness for the dust field. */
export function dustGeometry(count: number): THREE.BufferGeometry {
  return memo(`dust-${count}`, () => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      // Distributed through the volume the key light actually crosses, rather
      // than a uniform box — most of a uniform box would never be lit.
      positions[i * 3] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 1] = Math.random() * 4.6 - 0.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.2;

      seeds[i * 3] = Math.random() * Math.PI * 2; // phase
      seeds[i * 3 + 1] = 0.35 + Math.random() * 0.9; // drift speed
      seeds[i * 3 + 2] = 0.4 + Math.random() * 0.85; // size
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    return geo;
  });
}
