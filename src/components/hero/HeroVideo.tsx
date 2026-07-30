'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { assetPath } from '@/lib/asset';
import { useCapability, useDocumentVisible, useInViewport } from '@/lib/hooks';
import { markHeroReady, whenHeroRevealed } from '@/lib/readiness';

/**
 * HERO OPENING — the supplied brand animation.
 *
 * WHAT THIS ASSET IS, AND WHAT WAS REMOVED
 *
 * The master is a 10-second brand sting: darkness, a gold line, the ornamental
 * PW ring, the instrument resolving, then bullion and cash landing in the pans,
 * then a "PUREWEIGHT(R) GOLD EXCHANGE / CALL TO NOW" lockup.
 *
 * Only the first 4.55 seconds ships. Everything after it makes a claim this site
 * is not allowed to make:
 *
 *   ~4.8s  a bar struck "999.9 FINE GOLD / 1 KILO" — a purity and a
 *          handling-capacity claim, with nothing on file to support either
 *   ~6.0s  stacks of US dollar bills — asserts a currency and a jurisdiction
 *   ~7.0s  the (R) glyph — a registered-trademark assertion, which sits in the
 *          same category as the licences and certifications the brief forbids
 *          inventing
 *   ~7.8s  a "CALL TO NOW" button — duplicates the real CTAs, and points at a
 *          phone number that is still an unfilled placeholder
 *
 * The master is kept at media/masters/ for reference. It is deliberately outside
 * public/ so that no build can serve it.
 *
 * WHY IT PLAYS ONCE AND THEN STOPS
 *
 * WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) requires a pause control for motion
 * that starts automatically and runs for more than five seconds. This clip runs
 * 4.58 and does not loop, so it clears the threshold outright rather than
 * needing a control bolted on. A looping background would have required one —
 * and would have restarted the whole reveal every few seconds behind someone
 * trying to read the headline, which is the reason not to loop even where the
 * rules permit it.
 *
 * It also means the shot ends on the instrument standing level with empty pans,
 * which then holds for as long as the visitor stays. The still frame used on
 * every non-motion path is that same final frame, so all routes converge on one
 * composition.
 *
 * WHAT IS NOT GATED ON GPU
 *
 * The old hero was WebGL, so it was gated on `tier`. This is not: `tier` folds
 * in WebGL support, and a machine with a blocklisted driver plays H.264 without
 * trouble. Gating is on the two things that actually apply to video — declared
 * motion preference and connection cost.
 */

const STILL = assetPath('/video/hero-still.jpg');
const SOURCES = [
  { src: assetPath('/video/hero-atmosphere.webm'), type: 'video/webm' },
  { src: assetPath('/video/hero-atmosphere.mp4'), type: 'video/mp4' },
];

/**
 * Longest the opening will wait for a reveal signal before starting anyway.
 * Covers the loader failing, being skipped in an unexpected way, or never
 * mounting at all — the hero must not sit frozen on a signal that never comes.
 */
const REVEAL_CEILING_MS = 4500;

export function HeroVideo() {
  const capability = useCapability();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wrapperRef, inViewport] = useInViewport<HTMLDivElement>('200px');
  const documentVisible = useDocumentVisible();

  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  /**
   * `capability` is null until after mount, so the first client render matches
   * the server's. During that window neither branch commits — the section's own
   * near-black background stands in, which is also the clip's opening frame.
   */
  const declined = capability
    ? capability.reducedMotion || capability.saveData || capability.slowNetwork
    : false;
  const playVideo = Boolean(capability) && !declined && !failed;

  /* ---------------------------------------------------------------------- */
  /* READINESS — releases the opening curtain                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    // On a still-only path there is nothing further to load or decode: the
    // image IS the finished hero, so the curtain should not wait on video.
    if (capability && !playVideo) markHeroReady();
  }, [capability, playVideo]);

  /* ---------------------------------------------------------------------- */
  /* THE ONE-SHOT PLAY                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!playVideo) return;

    let cancelled = false;
    let timer = 0;

    const begin = async () => {
      const el = videoRef.current;
      if (!el || cancelled) return;

      try {
        // Rewind explicitly. The element may have been nudged forward by a
        // buffering heuristic before we were ready to show it, and the whole
        // point of waiting was to start at frame one.
        el.currentTime = 0;
        await el.play();
        if (!cancelled) setStarted(true);
      } catch {
        // A muted, playsinline video is virtually always permitted, but a
        // hardened privacy setting can still refuse. The still frame is a
        // complete hero, so this degrades rather than breaks.
        if (!cancelled) setFailed(true);
      }
    };

    void Promise.race([
      whenHeroRevealed(),
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, REVEAL_CEILING_MS);
      }),
    ]).then(begin);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playVideo]);

  /* ---------------------------------------------------------------------- */
  /* SUSPEND WHEN UNSEEN                                                    */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !started) return;

    // Once it has ended it holds its final frame forever. Calling play() on an
    // ended element seeks back to zero and replays it, which would turn a
    // deliberate one-shot into a loop triggered by scrolling.
    if (ended) return;

    if (inViewport && documentVisible) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [inViewport, documentVisible, started, ended]);

  /**
   * LAYER ORDER, AND WHY THE STILL IS ALWAYS MOUNTED
   *
   * `capability` is null during server render, so the HTML that ships always
   * contains the still. That is deliberate and does four jobs at once: it is the
   * crawler's and the no-JS visitor's hero, it is the reduced-motion hero, it is
   * a `priority` LCP candidate that paints without waiting for any decode, and it
   * is the layer the film dissolves out of.
   *
   * That last one matters because the still is the clip's FINAL frame — a lit
   * instrument — while the clip's first frame is near-darkness. Swapping one for
   * the other hard would flash from lit to black. On a first visit the opening
   * curtain hides that entirely, but a repeat visit in the same session has no
   * curtain, so the two are cross-dissolved instead. Read as a shot: the lights
   * go down, then the film brings them back up.
   */
  return (
    <div ref={wrapperRef} className="absolute inset-0 overflow-hidden">
      <Image
        src={STILL}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        priority
        className="hero-media"
        style={{
          opacity: started ? 0 : 1,
          transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {playVideo ? (
        <video
          ref={videoRef}
          className="hero-media absolute inset-0 h-full w-full"
          style={{
            opacity: started ? 1 : 0,
            transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          // Purely decorative. Everything it conveys is already said by the
          // headline, and the audio track was stripped during the cut, so there
          // is nothing for a screen reader to announce and no captions to add.
          aria-hidden="true"
          tabIndex={-1}
          muted
          playsInline
          disablePictureInPicture
          preload="auto"
          // No `poster` attribute: this element is held at zero opacity until
          // playback genuinely begins, so no partially-decoded frame is ever on
          // screen for a poster to cover, and the still underneath is doing that
          // job anyway.
          onLoadedData={markHeroReady}
          onEnded={() => setEnded(true)}
          onError={() => {
            setFailed(true);
            markHeroReady();
          }}
        >
          {SOURCES.map((s) => (
            <source key={s.type} src={s.src} type={s.type} />
          ))}
        </video>
      ) : null}
    </div>
  );
}
