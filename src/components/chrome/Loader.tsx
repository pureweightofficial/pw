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

/**
 * How fast the opening plays, as a multiple of its authored speed.
 *
 * The choreography below is authored at 1.0 and runs 2.25s. At 1.45 it runs
 * ~1.55s with every beat keeping its shape and relative timing — the sweep is
 * still a sweep, the seam still flashes at the moment of contact, the subtitle
 * still lands last.
 *
 * This is the single number that trades brand time against Largest Contentful
 * Paint, and it is deliberately one number so the trade is explicit. Raise it
 * for a faster page and a brisker opening; lower it toward 1.0 for the fullest
 * version of the animation and roughly 700ms more LCP.
 */
const OPENING_TEMPO = 1.45;

/** Authored length of the opening timeline, seconds, before OPENING_TEMPO. */
const OPENING_AUTHORED_MS = 2250;

/**
 * How long this visit may already have taken before the opening is abandoned.
 *
 * Measured against the site's own numbers rather than picked. A capable device
 * reaches this effect in roughly 200-400ms; the throttled mobile profile
 * Lighthouse uses takes well over a second, and on that profile the curtain
 * added 4.3s of LCP to the homepage and 9.9s to the contact page.
 *
 * 1200ms sits clearly above the fast case and clearly below the slow one, so
 * the rule almost never fires on the hardware the opening was designed for and
 * almost always fires on the hardware that cannot carry it. Raising it favours
 * the choreography; lowering it favours the metric.
 */
const OPENING_BUDGET_MS = 1200;

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

    /*
      THE OPENING IS A LUXURY, AND SLOW DEVICES CANNOT AFFORD IT.

      OPENING_TEMPO trades brand time against LCP for everyone equally, which
      is the wrong shape for the problem. Measured on a throttled mobile
      profile — the profile Google actually ranks on — the curtain cost 4.3s of
      LCP on the homepage and 9.9s on the contact page, against an authored
      timeline of about 1.55s. The excess is not choreography. It is the time
      taken to hydrate React and load GSAP before the first frame can even
      play, and it scales with how slow the device is.

      So the decision is now made per visitor rather than once at build time.
      `performance.now()` inside this effect is milliseconds since navigation
      started, which makes it a free, honest measure of how this particular
      visit is going. Past the budget, the visit is already slow and adding a
      curtain to it is indefensible; the visitor goes straight to the page.

      Fast devices still get the full opening, unchanged. The A/B that found
      this showed the homepage measuring 2176ms with the curtain skipped —
      inside Google's 2.5s threshold, from 6440ms with it.

      The skip is recorded as seen, because a curtain that appears on the third
      page of a session reads as a fault rather than an entrance.
    */
    const elapsed = performance.now();
    const tooSlow = elapsed > OPENING_BUDGET_MS;

    const show = !seen && !reduced && !tooSlow;
    setVisible(show);

    if (tooSlow && !seen) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* storage unavailable — worst case it is reconsidered next page */
      }
    }

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

    /*
      THE HANDOFF, TIGHTENED. Everything between dismiss() and the page being
      visible is time the visitor spends looking at a curtain they have already
      finished watching, and all of it lands on LCP.

      The emblem fade was 0.5s with the lift starting 0.2s before it ended, so
      the lift began 0.3s after dismiss. At 0.34 with a 0.26 overlap it begins
      after 0.08s — the fade still reads, because it is now mostly concurrent
      with the lift rather than sequential to it.

      The lift itself is 0.8s rather than 0.95s. It is the signature move and
      is deliberately NOT cut further; below about 0.7s a full-height curtain
      stops reading as a lift and starts reading as a cut.

      Net: ~370ms off every cold first paint, with the choreography intact.
    */
    gsap
      .timeline({ onComplete: () => setVisible(false) })
      .to(emblemRef.current, {
        opacity: 0,
        scale: 1.04,
        duration: 0.34,
        ease: "power2.inOut",
      })
      .to(
        root,
        { yPercent: -100, duration: 0.8, ease: "power3.inOut" },
        "-=0.26",
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

      /*
        ONE TEMPO KNOB FOR THE WHOLE OPENING, BECAUSE LCP IS DOWNSTREAM OF IT.

        Measured: this curtain is responsible for essentially all of the site's
        Largest Contentful Paint. Cold first visit LCP 3904ms; the identical
        build with the loader session-skipped, 220ms. Eighteen times faster.
        Nothing else on the page is close to that.

        The naive fix — lower MIN_MS — is wrong, and measuring the timeline is
        what showed it. The convergence is 1.4s but the FULL sequence runs to
        ~2.25s: seam flash at 1.12, neon strike at 1.31, subtitle landing at
        2.25. MIN_MS 2400 was chosen to just outlast it. Cutting the gate alone
        would have lifted the curtain over an opening still in progress.

        So the whole timeline is scaled by one number instead. Every beat keeps
        its shape and its relative timing — the two-sided sweep still reads as a
        sweep rather than the fade it degraded into when it was too fast, which
        is the failure this choreography was rebuilt to fix — the sequence just
        plays quicker. MIN_MS below is derived from this, so the two can never
        drift apart into the exact bug described above.
      */
      const tl = gsap.timeline();
      tl.timeScale(OPENING_TEMPO);
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

    /*
      DERIVED, NOT HARDCODED. This used to be a bare 2400 sitting several
      hundred lines away from the timeline it had to outlast — so nothing
      stopped the two drifting apart, and the failure mode is silent: the
      curtain lifts over an opening still playing, and nobody notices in
      review because it only shows on a cold first visit.

      Now it is the opening's own length plus a short settle, so retiming the
      animation retimes the gate automatically.
    */
    const MIN_MS = Math.round(OPENING_AUTHORED_MS / OPENING_TEMPO) + 150;
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
