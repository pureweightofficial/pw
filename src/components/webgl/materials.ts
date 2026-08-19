import * as THREE from 'three';
import { sceneQuality, advancedMaterialsEnabled } from './quality';
import {
  castGoldNormalMap,
  castGoldRoughnessMap,
  craquelureNormalMap,
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
        // The logo's crazed lacquer, at ornament scale.
        normalMap: craquelureNormalMap(),
        normalScale: new THREE.Vector2(0.55, 0.55),
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
        normalMap: craquelureNormalMap(),
        normalScale: new THREE.Vector2(0.28, 0.28),
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

/**
 * THE MASS. The one object the whole site is about, and the one that was wrong.
 *
 * Its first material was `roughness: 0.26` with `goldRoughnessMap()`. three
 * multiplies a roughness map into `material.roughness`, and that map outputs
 * 0.13–0.34, so the real roughness of the signature object was 0.034–0.088 —
 * a mirror. Everything downstream followed from that: a mirror in a room built
 * of rectangular light panels returns rectangles, which is precisely what
 * appeared on screen as flat khaki plates, and no geometry change can move a
 * reflection. (Rendering the same mesh with MeshNormalMaterial returns one
 * continuous smooth form, which settles it.)
 *
 * So the numbers here are inverted. `castGoldRoughnessMap` sits at 0.60–1.0 and
 * the base does the scaling, giving a true roughness around 0.28–0.50: glossy
 * enough to hold a bright edge, rough enough that the room arrives as gradients
 * instead of as shapes. The variation across that range is what stops the
 * highlight behaving like one clean blob sliding over a balloon.
 *
 * The colour is deliberately below the brand golds in saturation. At metalness
 * 1 the albedo IS the specular tint, so it multiplies every reflection; a
 * saturated albedo under a warm rig compounds into the candy orange this object
 * used to be. The room is fed nearly white and the metal does its own warming,
 * which is the same relationship the page's own macro photography has.
 */
export function massGold(): THREE.MeshStandardMaterial {
  return memo('gold-mass', () =>
    metal({
      /*
        WARMTH, RECOVERED. The first pass at this fix set #c2a163 to escape the
        candy orange the mirror-roughness bug had produced, and overshot: the
        mass rendered as pale sandstone sitting inches from the page's own macro
        coin photography, which is warm and rich. It read as stone, not metal.

        The orange was never the albedo's fault — it was a true roughness near
        0.05 clipping every reflection to white or to the panel colour. With
        roughness now genuinely 0.28–0.50, chroma is safe to carry again. This
        sits between the desaturated overcorrection and `bullionGold`'s #e0b44e,
        because the mass is unrefined material and should read a shade quieter
        than a finished bar standing next to it.
      */
      color: new THREE.Color('#cda256'),
      metalness: 1,
      /*
        0.42, not 0.5. Multiplied by castGoldRoughnessMap's 0.60–1.0 this is a
        true 0.25–0.42 — still far from the 0.05 mirror that caused the plates,
        but tight enough to return a HOT highlight rather than a uniform sheen.
        At 0.5 the whole object sat at one mid tone and read as weathered stone;
        metal is recognised by bright specular against dark, not by hue.
      */
      /*
        0.60, raised from 0.42, and the normal detail nearly tripled with it.

        At the size this mass is now presented — a held object filling a
        column, rather than a distant pebble — a true roughness of 0.25-0.42
        was still smooth enough that the studio's broad Lightformer panels
        reflected as two or three enormous soft gradients. Reviewed against a
        $100k bar by four independent design passes, that read unanimously as
        "a luminous smear", "molten neon", "a long-exposure light toy" — and
        they were right. Large smooth areas of near-mirror metal have nothing
        in them for the eye to read as surface, and the 8-bit gradient across
        them bands visibly.

        Precious metal is recognised by BROKEN specular: many small highlights
        travelling across a worked surface, not one big one sliding over
        glass. 0.52 x the map's 0.60-1.0 gives a true 0.31-0.52, and
        normalScale 1.15 lets the cast texture actually cut the reflections up
        instead of politely suggesting it.
      */
      roughness: 0.6,
      roughnessMap: castGoldRoughnessMap(),
      normalMap: castGoldNormalMap(),
      normalScale: new THREE.Vector2(1.45, 1.45),
      envMapIntensity: 1.05,
      // Buffed, not brushed: a light stretch on the highlight so it reads as a
      // worked surface rather than an injection moulding.
      anisotropy: 0.22,
      anisotropyRotation: Math.PI * 0.18,
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
        // Lifted from #151310 / env 0.5 after the first real render: forged
        // iron read as a silhouette hole in the frame rather than as a
        // material. Still far below the golds — iron absorbs the room, it just
        // has to visibly EXIST in it.
        color: new THREE.Color('#221d17'),
        metalness: 0.86,
        roughness: 0.66,
        roughnessMap: ironRoughnessMap(),
        normalMap: ironNormalMap(),
        normalScale: new THREE.Vector2(0.7, 0.7),
        envMapIntensity: 0.78,
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

/*
  benchSurface lived here — the near-black floor under the hero instrument. It
  went with HeroScene, its only consumer. See canvases.tsx for why the hero no
  longer carries a procedural scale.
*/
