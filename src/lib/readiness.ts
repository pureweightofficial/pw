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

/* -------------------------------------------------------------------------- */
/* THE RETURN SIGNAL                                                          */
/* -------------------------------------------------------------------------- */

/**
 * HERO REVEALED — the opposite direction to the pair above.
 *
 * `heroReady` runs hero -> loader ("I am worth showing"). This runs
 * loader -> hero ("you are now visible"), and exists because the hero's opening
 * is a 4.5-second video that plays exactly once.
 *
 * Without it the video would autoplay the instant it buffered, which is while
 * the curtain is still covering the screen — so the visitor would arrive part
 * way through, or after the end, having seen none of it. Nothing about that is
 * recoverable later, because there is no second play.
 *
 * Resolved at the START of the curtain lift rather than the end. The lift takes
 * ~1.25s and uncovers the page from the bottom, and the clip opens on near
 * darkness, so beginning underneath the moving curtain reads as one continuous
 * shot instead of two cues in sequence.
 *
 * Also resolved immediately when there is no curtain at all — a repeat visit in
 * the same session, or reduced motion, where the loader returns null.
 */
let resolveRevealed: (() => void) | null = null;
let revealed = false;

const heroRevealed: Promise<void> = new Promise<void>((resolve) => {
  resolveRevealed = resolve;
});

/** Called by the opening as it starts to lift, or if it never shows. */
export function markHeroRevealed(): void {
  if (revealed) return;
  revealed = true;
  resolveRevealed?.();
}

/** Awaited by the hero before it begins its one-shot opening. Never rejects. */
export function whenHeroRevealed(): Promise<void> {
  return heroRevealed;
}
