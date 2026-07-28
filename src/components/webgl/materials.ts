import * as THREE from 'three';
import { sceneQuality, advancedMaterialsEnabled } from './quality';
import {
  engravingNormalMap,
  goldRoughnessMap,
  graduationMap,
  ingotStampMap,
  ironNormalMap,
  ironRoughnessMap,
} from './textures';

/**
 * MATERIAL LIBRARY
 *
 * Two metals carry the whole instrument, and the entire job is making them
 * unmistakably different from each other under one light:
 *
 *   GOLD — metalness 1, low roughness, high env intensity. Reflects the room.
 *   IRON — metalness ~0.85, high and *varied* roughness, low env intensity.
 *          Absorbs the room and returns only a broad, soft sheen.
 *
 * The palette values are the brand's antique/rich/highlight golds used as
 * albedo. Because these are metals, albedo tints the reflection rather than
 * lighting the surface — which is exactly why gold here cannot look like a CSS
 * gradient: with no light on it, it goes black, as real gold does.
 */

const cache = new Map<string, THREE.Material>();

function memo<T extends THREE.Material>(key: string, build: () => T): T {
  // Quality tier is part of the identity — the low-tier build of a material is
  // a different shader program and must not reuse the high-tier cache slot.
  key = `${key}@${sceneQuality()}`;
  const hit = cache.get(key);
  if (hit) return hit as T;
  const mat = build();
  cache.set(key, mat);
  return mat;
}

export function disposeMaterials(): void {
  cache.forEach((m) => m.dispose());
  cache.clear();
}


/* -------------------------------------------------------------------------- */
/* TIER-AWARE METAL                                                           */
/* -------------------------------------------------------------------------- */

type MetalSpec = THREE.MeshStandardMaterialParameters & {
  anisotropy?: number;
  anisotropyRotation?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
};

/**
 * Builds a metal at the fidelity this device has earned.
 *
 * On high and medium tiers this is a MeshPhysicalMaterial with anisotropy (and
 * clearcoat where specified) — the stretched highlight that makes gold read as
 * *buffed* rather than merely shiny.
 *
 * On low tiers it collapses to MeshStandardMaterial. That drops a materially
 * heavier fragment shader across a full-screen canvas, and the effect it
 * removes is one that cannot be resolved on a 390px viewport anyway. Base
 * colour, metalness, roughness maps and normals are all preserved, so the metal
 * still reads as the same metal.
 */
export function metal(spec: MetalSpec): THREE.MeshStandardMaterial {
  const { anisotropy, anisotropyRotation, clearcoat, clearcoatRoughness, ...base } = spec;

  if (!advancedMaterialsEnabled()) return new THREE.MeshStandardMaterial(base);

  // The only place in this file that constructs a physical material directly.
  return new THREE.MeshPhysicalMaterial({
    ...base,
    ...(anisotropy !== undefined ? { anisotropy, anisotropyRotation } : {}),
    ...(clearcoat !== undefined ? { clearcoat, clearcoatRoughness } : {}),
  });
}

/* -------------------------------------------------------------------------- */
/* GOLD                                                                       */
/* -------------------------------------------------------------------------- */

/** Antique gold: the ornamental frame, plinth band, pan rims. Warm, worn. */
export function antiqueGold(): THREE.MeshStandardMaterial {
  return memo(
    'gold-antique',
    () =>
      metal({
        color: new THREE.Color('#b98220'),
        metalness: 1,
        roughness: 0.34,
        roughnessMap: goldRoughnessMap(),
        envMapIntensity: 1.15,
        // A whisper of anisotropy so highlights stretch along the polish
        // direction rather than sitting as round blobs.
        anisotropy: 0.28,
        anisotropyRotation: Math.PI * 0.25,
      }),
  );
}

/** Polished gold: the beam, pointer, finial. Brighter, tighter highlight. */
export function polishedGold(): THREE.MeshStandardMaterial {
  return memo(
    'gold-polished',
    () =>
      metal({
        color: new THREE.Color('#d7a83d'),
        metalness: 1,
        roughness: 0.19,
        roughnessMap: goldRoughnessMap(),
        envMapIntensity: 1.45,
        anisotropy: 0.34,
        anisotropyRotation: 0,
      }),
  );
}

/** Cast bullion: duller than worked gold, as an unpolished cast bar is. */
export function bullionGold(): THREE.MeshStandardMaterial {
  return memo(
    'gold-bullion',
    () =>
      metal({
        color: new THREE.Color('#e0b44e'),
        metalness: 1,
        roughness: 0.42,
        roughnessMap: goldRoughnessMap(),
        envMapIntensity: 1.1,
      }),
  );
}

/** The struck face of a bar — same metal, plus the stamped relief. */
export function stampedGold(): THREE.MeshStandardMaterial {
  return memo('gold-stamped', () => {
    const mat = metal({
      color: new THREE.Color('#e0b44e'),
      metalness: 1,
      roughness: 0.38,
      roughnessMap: goldRoughnessMap(),
      normalMap: ingotStampMap(),
      normalScale: new THREE.Vector2(0.85, 0.85),
      envMapIntensity: 1.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    return mat;
  });
}

/** Ornamental gold carrying the filigree band. */
export function engravedGold(): THREE.MeshStandardMaterial {
  return memo('gold-engraved', () => {
    const normal = engravingNormalMap().clone();
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.ClampToEdgeWrapping;
    normal.repeat.set(9, 1);
    normal.needsUpdate = true;

    return metal({
      color: new THREE.Color('#b98220'),
      metalness: 1,
      roughness: 0.3,
      roughnessMap: goldRoughnessMap(),
      normalMap: normal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
    });
  });
}

/* -------------------------------------------------------------------------- */
/* IRON                                                                       */
/* -------------------------------------------------------------------------- */

/** Forged, blackened iron: the internal structure and the plinth body. */
export function forgedIron(): THREE.MeshStandardMaterial {
  return memo(
    'iron-forged',
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#151310'),
        metalness: 0.86,
        roughness: 0.66,
        roughnessMap: ironRoughnessMap(),
        normalMap: ironNormalMap(),
        normalScale: new THREE.Vector2(0.7, 0.7),
        envMapIntensity: 0.5,
      }),
  );
}

/** Gunmetal: slightly lighter iron for the fulcrum and bearing block. */
export function gunmetal(): THREE.MeshStandardMaterial {
  return memo(
    'iron-gunmetal',
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#22201c'),
        metalness: 0.92,
        roughness: 0.44,
        roughnessMap: ironRoughnessMap(),
        envMapIntensity: 0.72,
      }),
  );
}

/** Chain links: darkened steel with just enough sheen to read as separate. */
export function chainSteel(): THREE.MeshStandardMaterial {
  return memo(
    'chain-steel',
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#2b2823'),
        metalness: 0.95,
        roughness: 0.38,
        envMapIntensity: 0.9,
      }),
  );
}

/* -------------------------------------------------------------------------- */
/* THE COUNTERWEIGHT                                                          */
/* -------------------------------------------------------------------------- */

/** Dense charcoal stone — the sealed valuation block. Deliberately not cash. */
export function sealStone(): THREE.MeshStandardMaterial {
  return memo(
    'seal-stone',
    () =>
      metal({
        color: new THREE.Color('#0c0b09'),
        metalness: 0.18,
        roughness: 0.42,
        roughnessMap: ironRoughnessMap(),
        clearcoat: 0.35,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.55,
      }),
  );
}

/* -------------------------------------------------------------------------- */
/* INSTRUMENT FACE                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The graduation arc. Unlit and untonemapped so the engraved ticks stay crisp
 * and legible at any exposure — this is the one surface in the scene that is
 * information rather than atmosphere, and it must never fall into shadow.
 */
export function graduationFace(): THREE.MeshBasicMaterial {
  return memo(
    'graduation',
    () =>
      new THREE.MeshBasicMaterial({
        map: graduationMap(),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.85,
      }),
  );
}

/** The dark backing plate the graduations are struck into. */
export function instrumentPlate(): THREE.MeshStandardMaterial {
  return memo(
    'instrument-plate',
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0d0c0a'),
        metalness: 0.7,
        roughness: 0.58,
        roughnessMap: ironRoughnessMap(),
        envMapIntensity: 0.4,
        side: THREE.DoubleSide,
      }),
  );
}

/* -------------------------------------------------------------------------- */
/* ROOM                                                                       */
/* -------------------------------------------------------------------------- */

/** The floor the instrument stands on — near-black, faintly reflective. */
export function benchSurface(): THREE.MeshStandardMaterial {
  return memo(
    'bench',
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#080807'),
        metalness: 0.55,
        roughness: 0.72,
        roughnessMap: ironRoughnessMap(),
        envMapIntensity: 0.35,
      }),
  );
}
