/**
 * THE TIMELINE.
 *
 * One normalised 0→1 progression across the whole document, cut into seven
 * chapters. The WebGL world reads ONLY this — never a DOM section, never an
 * element ref, never a per-section ScrollTrigger of its own.
 *
 * That separation is the reason the world can be continuous. A scene wired to
 * individual sections has to be torn down and rebuilt whenever the page
 * reflows or a section is reordered, which is exactly how the site ended up
 * with five independent canvases mounting and unmounting behind the content.
 * A camera that reads a single number cannot fall out of step with itself.
 *
 * Boundaries are the ones set in the brief. They are deliberately uneven:
 * the hero reveal is short because nobody scrolls slowly through it, and the
 * market and valuation chapters are long because that is where the visitor is
 * actually deciding something.
 */

export type ChapterKey =
  | "hero"
  | "weight"
  | "purity"
  | "market"
  | "value"
  | "trust"
  | "close";

export type Chapter = {
  key: ChapterKey;
  /** Inclusive start of this chapter on the document timeline. */
  from: number;
  /** Exclusive end. */
  to: number;
};

export const CHAPTERS: Chapter[] = [
  { key: "hero", from: 0.0, to: 0.15 },
  { key: "weight", from: 0.15, to: 0.3 },
  { key: "purity", from: 0.3, to: 0.45 },
  { key: "market", from: 0.45, to: 0.62 },
  { key: "value", from: 0.62, to: 0.75 },
  { key: "trust", from: 0.75, to: 0.9 },
  { key: "close", from: 0.9, to: 1.0 },
];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Which chapter a given document progress falls in. Never returns undefined. */
export function chapterAt(progress: number): Chapter {
  const p = clamp01(progress);
  for (const c of CHAPTERS) if (p >= c.from && p < c.to) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

/** 0→1 within the chapter containing `progress`. */
export function chapterProgress(progress: number): number {
  const c = chapterAt(progress);
  const span = c.to - c.from;
  return span <= 0 ? 0 : clamp01((clamp01(progress) - c.from) / span);
}

/**
 * How far a named chapter has run, 0 before it starts and 1 after it ends.
 *
 * This is the workhorse: it lets any part of the world say "fade the platform
 * in across the weight chapter" without knowing where that chapter sits, so
 * moving a boundary above moves everything that depends on it.
 */
export function progressThrough(key: ChapterKey, progress: number): number {
  const c = CHAPTERS.find((x) => x.key === key);
  if (!c) return 0;
  const span = c.to - c.from;
  return span <= 0 ? 0 : clamp01((clamp01(progress) - c.from) / span);
}

/**
 * A smooth 0→1→0 window that peaks while `key` is on screen, used for anything
 * that should appear for one chapter and leave — the weighing platform, the
 * inspection line. `ramp` is how much of the chapter is spent arriving and
 * leaving, so 0.25 means a quarter in, a half held, a quarter out.
 */
export function chapterWindow(key: ChapterKey, progress: number, ramp = 0.25): number {
  const t = progressThrough(key, progress);
  if (t <= 0 || t >= 1) return 0;
  const inRamp = clamp01(t / ramp);
  const outRamp = clamp01((1 - t) / ramp);
  const w = Math.min(inRamp, outRamp);
  return w * w * (3 - 2 * w); // smoothstep, so nothing starts or stops abruptly
}
