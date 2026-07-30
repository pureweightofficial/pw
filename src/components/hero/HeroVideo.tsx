'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { assetPath } from '@/lib/asset';
import { useCapability, useDocumentVisible, useInViewport } from '@/lib/hooks';
import { markHeroReady, whenHeroRevealed } from '@/lib/readiness';

/**
 * HERO OPENING — the supplied brand animation, looping.
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
 *          same category as the licences the brief forbids inventing
 *   ~7.8s  a "CALL TO NOW" button — duplicates the real CTAs, and points at a
 *          phone number that is still an unfilled placeholder
 *
 * The master is kept at media/masters/ for reference. It is deliberately outside
 * public/ so that no build can serve it.
 *
 * WHY THE FILE IS A PALINDROME
 *
 * The clip is a build-up: it opens on near-darkness and closes on a lit
 * instrument. Looping that directly would hard-cut from full light back to black
 * every few seconds — the most conspicuous thing on the page.
 *
 * So the shipped file is the cut followed by itself reversed: 4.58s forward,
 * 4.58s back, 9.17s total. Its first and last frames are therefore the same
 * frame, and `loop` has nothing to cut between — measured at 0.25/255 mean
 * channel difference across the seam. The effect reads as light gathering and
 * dissipating, indefinitely.
 *
 * WCAG 2.2 SC 2.2.2 — PAUSE, STOP, HIDE
 *
 * Motion that starts automatically and runs beyond five seconds must be
 * pausable. A loop runs indefinitely, so it needs a control — which is why the
 * hero renders one. An earlier one-shot revision at 4.58s cleared the threshold
 * outright and needed no control; a loop does not get that exemption. The
 * control is real, keyboard reachable, and its state is honest.
 *
 * WHAT IS NOT GATED ON GPU
 *
 * The old hero was WebGL, so it was gated on `tier`. This is not: `tier` folds
 * in WebGL support, and a machine with a blocklisted driver plays H.264 without
 * trouble. Gating is on the two things that actually apply to video — declared
 * motion preference and connection cost.
 *
 * H.264 ONLY, DELIBERATELY
 *
 * A VP9 sibling was built and thrown away: on this content — dark, soft
 * gradients, fine gold filigree — it came out at 785KB against H.264's 659KB.
 * WebM's whole justification was fewer bytes, and it lost, so there is one file.
 */

const STILL = assetPath('/video/hero-still.jpg');
const FILM = assetPath('/video/hero-atmosphere.mp4');

/**
 * Longest the opening will wait for a reveal signal before starting anyway.
 *
 * Deliberately LONGER than the loader's own 6000ms failsafe plus its ~1.25s
 * lift. An earlier value of 4500ms was a live bug, measured on the real deploy:
 * it fired while the curtain still covered the screen, and back when the film
 * played only once that spent the single play behind it — the curtain lifted
 * onto a shot that had already finished. This ceiling must never be able to
 * pre-empt a real curtain.
 */
const REVEAL_CEILING_MS = 8000;

/**
 * How long to wait for enough buffer before playing regardless.
 *
 * Starting an unbuffered film means the visitor watches it stall. Measured on
 * the deploy: a starved element sat at readyState 2 and advanced 0.9s while
 * several seconds of wall clock went by.
 */
const PLAYABLE_CEILING_MS = 9000;

/**
 * Connection tiers on which a 659KB film is genuinely not worth serving.
 *
 * NOT "3g". The renderer's `slowNetwork` includes 3g, because it is weighing
 * ~600KB of three.js plus shader compilation — a different question. Reusing
 * that threshold here was a measured bug: Chrome reports "3g" freely, including
 * on desktop and on localhost, so the film was being withheld from connections
 * that could carry it several times over. A real browser reporting "3g" over
 * loopback is what exposed it.
 *
 * On a true 2g connection the film would take tens of seconds and never finish
 * before the visitor left, so those two tiers still get the still frame.
 */
const TOO_SLOW_FOR_FILM = /^(slow-2g|2g)$/;

/**
 * Resolves when the element can very likely play through without stalling, or
 * when the ceiling expires. `canplaythrough` is the browser's own judgement on
 * exactly this question, and is not guaranteed to fire — hence the bound.
 */
function whenPlayable(el: HTMLVideoElement, capMs: number): Promise<void> {
  if (el.readyState >= el.HAVE_ENOUGH_DATA) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      el.removeEventListener('canplaythrough', finish);
      resolve();
    };

    const timer = window.setTimeout(finish, capMs);
    el.addEventListener('canplaythrough', finish, { once: true });
  });
}

export type HeroVideoProps = {
  /** Visitor-operated pause, owned by the hero so the control can live above the scrims. */
  paused: boolean;
  /** Reports whether a film is actually running, so the control only appears when it is. */
  onActiveChange: (active: boolean) => void;
};

export function HeroVideo({ paused, onActiveChange }: HeroVideoProps) {
  const capability = useCapability();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [wrapperRef, inViewport] = useInViewport<HTMLDivElement>('200px');
  const documentVisible = useDocumentVisible();

  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

  /**
   * `capability` is null until after mount, so the first client render matches
   * the server's. During that window the still stands in, which is also what
   * ships in the HTML.
   */
  const declined = capability
    ? capability.reducedMotion ||
      capability.saveData ||
      TOO_SLOW_FOR_FILM.test(capability.effectiveType)
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

  /** Let the hero know whether there is anything to offer a pause control for. */
  useEffect(() => {
    onActiveChange(started && !failed);
  }, [started, failed, onActiveChange]);

  /* ---------------------------------------------------------------------- */
  /* BUFFER, THEN PLAY                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!playVideo) return;
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;
    let revealTimer = 0;
    let loadListener: (() => void) | null = null;

    // Belt and braces on the autoplay policy: React sets the muted PROPERTY but
    // does not emit the attribute, and some engines consult the attribute at
    // parse time. Verified in a real browser: property true, attribute absent.
    el.muted = true;
    el.setAttribute('muted', '');

    /**
     * Buffering must not begin until window.load has fired.
     *
     * A media element that is loading sets the "delay the load event" flag — and
     * the opening curtain waits on window.load before it will lift. So
     * pre-buffering the film delayed the curtain, which delayed the film, which
     * is how a 4.5s reveal ceiling ended up firing first. `preload="none"` in
     * the markup keeps the element out of that dependency entirely, and loading
     * is kicked off here instead.
     */
    const startBuffering = () => {
      const node = videoRef.current;
      if (cancelled || !node) return;
      node.preload = 'auto';
      node.load();
    };

    if (document.readyState === 'complete') {
      startBuffering();
    } else {
      loadListener = startBuffering;
      window.addEventListener('load', loadListener, { once: true });
    }

    const revealed = Promise.race([
      whenHeroRevealed(),
      new Promise<void>((resolve) => {
        revealTimer = window.setTimeout(resolve, REVEAL_CEILING_MS);
      }),
    ]);

    void (async () => {
      // BOTH conditions, in this order. Visible but unbuffered means the visitor
      // watches it stutter; buffered but still hidden means the opening is spent
      // behind the curtain. Waiting on the curtain first also means the buffer
      // has had the whole curtain to fill, so the second await is usually free.
      await revealed;
      if (cancelled || !videoRef.current) return;

      await whenPlayable(videoRef.current, PLAYABLE_CEILING_MS);
      const node = videoRef.current;
      if (cancelled || !node) return;

      try {
        // Rewind explicitly: a buffering heuristic may have nudged the element
        // forward, and the point of waiting was to open on frame one.
        node.currentTime = 0;
        await node.play();
        if (!cancelled) setStarted(true);
      } catch {
        // A muted, playsinline video is virtually always permitted, but a
        // hardened privacy setting or low-power mode can still refuse. The still
        // frame is a complete hero, so this degrades rather than breaks.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      if (loadListener) window.removeEventListener('load', loadListener);
    };
  }, [playVideo]);

  /* ---------------------------------------------------------------------- */
  /* WHEN IT RUNS, AND WHEN IT DOES NOT                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !started) return;

    /**
     * Three reasons to stop, and only one of them is the visitor's:
     *
     *   paused           — the SC 2.2.2 control. Explicit, and must be obeyed.
     *   !inViewport      — the hero has scrolled away. Decoding a film nobody
     *                      can see is the most wasteful thing on the page.
     *   !documentVisible — the tab is backgrounded. Same argument, more so.
     *
     * The last two are invisible to the visitor and are pure power saving; the
     * film is always running whenever it is actually on screen. Because the
     * element is looping rather than ended, play() resumes from where it stopped
     * instead of restarting, so scrolling past and back does not replay the
     * opening.
     */
    if (inViewport && documentVisible && !paused) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [inViewport, documentVisible, paused, started]);

  /* ---------------------------------------------------------------------- */

  /**
   * LAYER ORDER, AND WHY THE STILL IS ALWAYS MOUNTED
   *
   * `capability` is null during server render, so the HTML that ships always
   * contains the still. That is deliberate and does four jobs at once: it is the
   * crawler's and the no-JS visitor's hero, it is the reduced-motion hero, it is
   * a `priority` LCP candidate that paints without waiting for any decode, and it
   * is the layer the film dissolves out of.
   *
   * That last one matters because the still is the lit instrument while the
   * film's first frame is near-darkness. Swapping one for the other hard would
   * flash from lit to black. On a first visit the opening curtain hides that
   * entirely, but a repeat visit in the same session has no curtain, so the two
   * are cross-dissolved instead. Read as a shot: the lights go down, then the
   * film brings them back up.
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
          loop
          playsInline
          disablePictureInPicture
          // "none", not "auto": see startBuffering above. Loading is started
          // deliberately after window.load so the film cannot delay the curtain
          // that is waiting to reveal it.
          preload="none"
          // No `poster` attribute: this element is held at zero opacity until
          // playback genuinely begins, so no partially-decoded frame is ever on
          // screen for a poster to cover, and the still underneath is doing that
          // job anyway.
          onLoadedData={markHeroReady}
          onCanPlay={markHeroReady}
          onError={() => {
            setFailed(true);
            markHeroReady();
          }}
          src={FILM}
        />
      ) : null}
    </div>
  );
}
