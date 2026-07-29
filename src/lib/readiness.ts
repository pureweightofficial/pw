/**
 * HERO READINESS
 *
 * A one-shot signal the opening sequence waits on before lifting the curtain.
 *
 * WHY IT EXISTS: `window.load` only guarantees that documents, styles, fonts
 * and images have arrived. It says nothing about WebGL, which still has to
 * create its context, upload the procedural textures and compile shaders after
 * that. So the curtain used to lift onto a poster, and the live scene popped in
 * a beat later — the single most expensive-looking mistake a loading sequence
 * can make, because the visitor sees the seam between the two states.
 *
 * Now the hero declares when it is genuinely presentable, and the curtain waits
 * for it. That covers every path:
 *
 *   WebGL running   -> resolves on the first composited frame
 *   WebGL declined  -> resolves immediately; the poster IS the final state
 *   WebGL failed    -> resolves immediately; the poster is the fallback
 *   Nothing signals -> the loader's own ceiling dismisses it anyway
 *
 * Deliberately a bare promise rather than React state: the loader and the scene
 * live in different subtrees, and this must work regardless of mount order —
 * the scene may become ready before the loader ever asks.
 */

let resolveHero: (() => void) | null = null;
let settled = false;

const heroReady: Promise<void> = new Promise<void>((resolve) => {
  resolveHero = resolve;
});

/**
 * Called by the hero once it has something worth showing — a composited WebGL
 * frame, or the decision that the poster is final. Safe to call more than once.
 */
export function markHeroReady(): void {
  if (settled) return;
  settled = true;
  resolveHero?.();
}

/** Awaited by the opening sequence. Never rejects. */
export function whenHeroReady(): Promise<void> {
  return heroReady;
}

/** True once the hero has signalled. Used to skip waiting on a repeat visit. */
export function isHeroReady(): boolean {
  return settled;
}
