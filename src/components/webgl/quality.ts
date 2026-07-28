import type { QualityTier } from '@/lib/capability';

/**
 * SCENE QUALITY
 *
 * Set once by SceneShell before any scene mounts, and read by the texture and
 * material factories so they can build cheaper variants on weak hardware.
 *
 * WHY THIS EXISTS — the budget audit (`npm run check:budget`) showed the hero
 * at ~31k triangles and 34 draw calls, which is trivial for any GPU made this
 * decade. Geometry was never the constraint. The two things that actually cost
 * on a low-end phone are:
 *
 *  1. FRAGMENT SHADING. `MeshPhysicalMaterial` with `anisotropy` compiles a far
 *     heavier fragment shader than `MeshStandardMaterial`, and the scene fills
 *     the whole viewport. On a small screen the stretched-highlight effect
 *     anisotropy buys is essentially invisible — so it is the first thing to go.
 *  2. TEXTURE MEMORY. Seven 512² RGBA maps with mipmaps is ~9.3 MB of VRAM.
 *     At 256² that drops to ~2.3 MB, and on a 390px-wide viewport the
 *     difference in the scratch pattern cannot be resolved anyway.
 *
 * Optimising the thing you measured rather than the thing you assumed.
 */

let tier: QualityTier = 'high';

export function setSceneQuality(next: QualityTier): void {
  tier = next;
}

export function sceneQuality(): QualityTier {
  return tier;
}

/** Procedural map resolution. Halved on low-end devices. */
export function mapSize(): number {
  return tier === 'low' || tier === 'none' ? 256 : 512;
}

/**
 * Whether to pay for the physically-based extras — anisotropy and clearcoat.
 * These are the expensive parts of MeshPhysicalMaterial's shader.
 */
// Deliberately NOT named `use…` — it is a plain predicate, not a React hook,
// and the `use` prefix makes rules-of-hooks reject it inside helper functions.
export function advancedMaterialsEnabled(): boolean {
  return tier === 'high' || tier === 'medium';
}

/** Lathe/tube segment counts, scaled to tier. */
export function segments(high: number): number {
  if (tier === 'high') return high;
  if (tier === 'medium') return Math.max(8, Math.round(high * 0.75));
  return Math.max(6, Math.round(high * 0.5));
}
