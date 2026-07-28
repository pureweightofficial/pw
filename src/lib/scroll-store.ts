/**
 * SCROLL STORE
 *
 * A module-level mutable store read directly inside `useFrame`. Deliberately
 * NOT React state: the WebGL scene samples scroll and pointer every frame, and
 * routing that through React would re-render the tree 60x/second for values no
 * DOM node needs. GSAP ScrollTrigger writes here; three.js reads here.
 *
 * `balance` is the spine of the whole site — it drives the beam tilt in the
 * hero scene, in the finale scene, and in every CSS divider on the page, so the
 * page literally comes into balance as the visitor reads it.
 */

export type ScrollState = {
  /** Whole-document progress, 0 at top, 1 at the very bottom. */
  progress: number;
  /** Hero section self-progress, 0 while pinned at top, 1 when scrolled past. */
  hero: number;
  /** Valuation-journey self-progress. */
  journey: number;
  /** Assay section self-progress. */
  assay: number;
  /** Final-balance section self-progress. */
  finale: number;
  /**
   * 0 = the scale sits at its opening tilt, 1 = perfectly level.
   * Advances through the journey and locks at 1 once the finale is reached.
   */
  balance: number;
  /** Pointer position in normalised device coordinates, -1..1. */
  pointerX: number;
  pointerY: number;
  /** Whether the pointer is currently over an interactive WebGL surface. */
  pointerActive: boolean;
  /** Scroll velocity in px/frame, damped. Used for subtle chain lag. */
  velocity: number;
  /** Which journey stage index is currently active (-1 = none). */
  journeyStage: number;
  /** Which assay factor index is currently active (-1 = none). */
  assayFactor: number;
};

export const scrollState: ScrollState = {
  progress: 0,
  hero: 0,
  journey: 0,
  assay: 0,
  finale: 0,
  balance: 0,
  pointerX: 0,
  pointerY: 0,
  pointerActive: false,
  velocity: 0,
  journeyStage: -1,
  assayFactor: -1,
};

export function setScroll(patch: Partial<ScrollState>): void {
  Object.assign(scrollState, patch);
}

/** Resets to the opening state (used on route change). */
export function resetScroll(): void {
  setScroll({
    progress: 0,
    hero: 0,
    journey: 0,
    assay: 0,
    finale: 0,
    balance: 0,
    velocity: 0,
    journeyStage: -1,
    assayFactor: -1,
  });
}

/* -------------------------------------------------------------------------- */
/* MATH HELPERS — shared by scene code                                        */
/* -------------------------------------------------------------------------- */

export const clamp = (v: number, min = 0, max = 1): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent damping. `lambda` is roughly "how fast", and the
 * result is identical at 30fps and 144fps — important because the scale must
 * settle at the same *physical* rate on every machine, not faster on fast GPUs.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Maps `v` from [inMin,inMax] to [outMin,outMax], clamped. */
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  if (inMax === inMin) return outMin;
  const t = clamp((v - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * t;
};

/** Smoothstep easing, for reveals that should not start or stop abruptly. */
export const smoothstep = (t: number): number => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
