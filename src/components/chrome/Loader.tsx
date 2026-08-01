"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { markHeroRevealed, whenHeroReady } from "@/lib/readiness";

/**
 * THE OPENING
 *
 * The name arrives as two halves: PURE sweeps in from the left edge of the
 * screen, WEIGHT from the right, and they fuse in the centre with a single
 * seam-flash — then the joined word settles into a steady neon-gold glow and
 * the curtain lifts. Roughly 2.6 seconds.
 *
 * Four rules keep it from becoming the thing everyone hates about luxury sites:
 *
 *  - ONCE PER SESSION. Stored in sessionStorage, so navigating back to the
 *    homepage does not make anyone sit through it twice.
 *  - ALWAYS SKIPPABLE. A visible control, plus Escape, plus any click. The skip
 *    is focused on mount, so a keyboard visitor's first Tab is already on it.
 *  - HONEST PROGRESS. The counter tracks real font and document readiness. It
 *    holds at 96% if the page genuinely is not ready rather than lying its way
 *    to 100 and then stalling on a black screen.
 *  - REDUCED MOTION SKIPS IT ENTIRELY. Not a shortened version — none at all.
 *
 * The page beneath is fully rendered the whole time. This is a curtain, not a
 * gate: if the JS for it never runs, nothing is lost.
 */

const SESSION_KEY = "pw:loader:v2"; // bumped: neon opening replaces the emblem wipe

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // `null` = undecided. Nothing renders until we know, which avoids both a
  // hydration mismatch and a flash of the loader for repeat visitors.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Private mode with storage disabled: treat as unseen, show it once.
    }

    const show = !seen && !reduced;
    setVisible(show);

    // No curtain means nothing will ever lift, so release the hero's opening
    // right away rather than making it wait out its own timeout.
    if (!show) markHeroRevealed();
  }, []);

  const dismiss = useCallback(() => {
    const root = rootRef.current;

    // Fired as the lift BEGINS, not on completion — see readiness.ts. The hero
    // video's first second is near-black, so it plays under the rising curtain
    // as one shot.
    markHeroRevealed();

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* storage unavailable — the loader simply shows again next session */
    }

    timelineRef.current?.kill();

    if (!root) {
      setVisible(false);
      return;
    }

    gsap
      .timeline({ onComplete: () => setVisible(false) })
      .to(emblemRef.current, {
        opacity: 0,
        scale: 1.04,
        duration: 0.5,
        ease: "power2.inOut",
      })
      .to(
        root,
        { yPercent: -100, duration: 0.95, ease: "power3.inOut" },
        "-=0.2",
      );
  }, []);

  useEffect(() => {
    if (visible !== true) return;

    const root = rootRef.current;
    if (!root) return;

    skipRef.current?.focus();

    const ctx = gsap.context(() => {
      // Off-screen at the actual viewport edges, not a fixed pixel amount —
      // `x: -50vw` clears the left edge on every width the clamp()ed type can
      // reach. Dim until they arrive, so the glow reads as switching ON.
      gsap.set(".pw-neon-left", { x: "-52vw", opacity: 0 });
      gsap.set(".pw-neon-right", { x: "52vw", opacity: 0 });
      gsap.set(".pw-neon-seam", { opacity: 0, scaleY: 0.2 });
      gsap.set(".pw-loader-text", { opacity: 0, y: 14, filter: "blur(6px)" });

      const tl = gsap.timeline();
      timelineRef.current = tl;

      // The two halves converge. power2.inOut, NOT a *.out ease: filmed at
      // 180ms, power4.out had already covered ~40% of the travel, so the
      // two-sided sweep — the entire point of this opening — read as a fade.
      // inOut leaves the words visibly at the screen edges for the first
      // beats, lets them gather speed, and still brakes into the join.
      tl.to(".pw-neon-left", {
        x: 0,
        opacity: 1,
        duration: 1.4,
        ease: "power2.inOut",
      })
        .to(
          ".pw-neon-right",
          { x: 0, opacity: 1, duration: 1.4, ease: "power2.inOut" },
          "<",
        )
        // The seam: one bright vertical flash at the instant of contact,
        // then gone. It never repeats.
        .to(
          ".pw-neon-seam",
          { opacity: 1, scaleY: 1, duration: 0.14, ease: "power2.out" },
          "-=0.28",
        )
        .to(".pw-neon-seam", {
          opacity: 0,
          duration: 0.5,
          ease: "power2.inOut",
        })
        // The neon "strikes": two quick dips as the tube warms, then steady.
        // Keyframed opacity only — nothing here touches layout or paint.
        .to(
          ".pw-neon-word",
          {
            keyframes: [
              { opacity: 0.62, duration: 0.07 },
              { opacity: 1, duration: 0.09 },
              { opacity: 0.8, duration: 0.06 },
              { opacity: 1, duration: 0.12 },
            ],
          },
          "-=0.45",
        )
        .to(
          ".pw-loader-text",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.85,
            ease: "power3.out",
          },
          "-=0.25",
        );
    }, root);

    /* ---------------------------------------------------------------- */
    /* PROGRESS                                                          */
    /* ---------------------------------------------------------------- */

    const started = performance.now();
    const MIN_MS = 2400;
    let ready = false;
    let raf = 0;

    /**
     * What "ready" actually means.
     *
     * `window.load` is not enough on its own: it fires once documents, styles,
     * fonts and images have arrived, but WebGL still has to create its context,
     * upload the procedural textures and compile shaders after that. Lifting on
     * load alone revealed a poster that visibly popped into the live scene a
     * beat later.
     *
     * The hero signal closes that gap, and is capped so a slow GPU delays the
     * curtain by at most a couple of seconds rather than holding it hostage.
     */
    const HERO_WAIT_CEILING = 2600;

    const readiness = Promise.allSettled([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) =>
            window.addEventListener("load", () => resolve(), { once: true }),
          ),
      Promise.race([
        whenHeroReady(),
        new Promise<void>((resolve) =>
          window.setTimeout(resolve, HERO_WAIT_CEILING),
        ),
      ]),
    ]);

    readiness.then(() => {
      ready = true;
    });

    const tick = () => {
      const elapsed = performance.now() - started;
      const timed = Math.min(1, elapsed / MIN_MS);

      // Ease toward 96 on the timer, and only cross it once the page really is
      // ready. A counter that hits 100 and then waits is worse than no counter.
      const value = ready
        ? Math.min(100, timed * 100)
        : Math.min(96, timed * 96);
      setPercent(Math.round(value));

      if (value >= 100) {
        dismiss();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    /* ---------------------------------------------------------------- */
    /* ESCAPE HATCHES                                                    */
    /* ---------------------------------------------------------------- */

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
    };

    // Absolute ceiling. If anything above goes wrong, the curtain still lifts.
    const failsafe = window.setTimeout(dismiss, 6000);

    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.removeEventListener("keydown", onKey);
      ctx.revert();
      timelineRef.current = null;
    };
  }, [visible, dismiss]);

  if (visible !== true) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-void grain"
      role="status"
      aria-live="polite"
      aria-label="Loading Pureweight Gold Exchange"
      onClick={dismiss}
    >
      <div ref={emblemRef} className="flex flex-col items-center px-6">
        {/*
          THE NAME, ARRIVING AS TWO HALVES.

          "PURE" sweeps in from the left edge of the screen, "WEIGHT" from the
          right, and they fuse in the centre — the brand name assembled the same
          way the business works, two sides meeting at a balance point. A
          hairline seam flashes at the moment of contact and the joined word
          settles into a steady neon-gold glow.

          The glow is layered text-shadow on the words themselves (cheap, no
          filters, no extra layers); only transforms and opacity are animated, so
          the whole opening stays on the compositor. `overflow-hidden` on the
          fixed root clips the entry, so the words genuinely come from off-screen
          rather than fading in near the middle.
        */}
        <div
          className="relative flex select-none items-baseline"
          aria-hidden="true"
        >
          <span className="pw-neon-word pw-neon-left font-display text-[clamp(2.4rem,9vw,5.5rem)] leading-none text-gold-high">
            PURE
          </span>
          <span className="pw-neon-word pw-neon-right font-display text-[clamp(2.4rem,9vw,5.5rem)] leading-none text-gold-high">
            WEIGHT
          </span>
          {/* The seam — flashes once at the instant the halves meet. */}
          <span className="pw-neon-seam pointer-events-none absolute left-1/2 top-[-12%] h-[124%] w-px" />
        </div>

        <div className="pw-loader-text mt-10 flex flex-col items-center gap-3">
          {/* Mirrors the logo lockup: PUREWEIGHT over GOLD EXCHANGE. */}
          <p className="label text-[0.6rem] tracking-[0.55em] text-gold-antique">
            Gold Exchange
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-3xl text-gold-pale tabular-nums"
              aria-hidden="true"
            >
              {String(percent).padStart(3, "0")}
            </span>
            <span className="text-[0.6rem] tracking-[0.3em] text-ash uppercase">
              per cent
            </span>
          </div>
        </div>
      </div>

      {/* A hairline that levels as loading completes — the balance motif, in its
          smallest possible form. */}
      <div className="absolute bottom-0 left-0 h-px w-full bg-bronze/30">
        <div
          className="h-full bg-linear-to-r from-gold-antique/40 via-gold-high to-gold-antique/40 transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        /*
          A 44x44 hit area around 15px of text.

          Measured at 360, 390 and 844 wide: this button's target was 31x15,
          because it had no padding and a button's hit area is its box. WCAG 2.2
          SC 2.5.8 sets the floor at 24x24, so 15 tall failed outright — and it
          was the ONLY on-screen target under 24px anywhere on the site, which
          is why it is worth the fiddly offsets rather than a blanket rule.

          min-h-11/min-w-11 is 44px each, the comfort size rather than the bare
          minimum, because this is a dismiss control people reach for in a hurry.
          The inset values are reduced by exactly the padding the flex box adds
          (bottom-8 -> bottom-5, right-6 -> right-3, sm:right-10 -> sm:right-7)
          so the text stays optically where it was and only the target grows.
        */
        className="absolute bottom-5 right-3 flex min-h-11 min-w-11 items-center justify-center text-[0.62rem] tracking-[0.28em] text-ash uppercase transition-colors duration-300 hover:text-gold-high sm:right-7"
      >
        Skip
      </button>
    </div>
  );
}
