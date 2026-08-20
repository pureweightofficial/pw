"use client";

import { LazyMotion } from "motion/react";

/*
  Loaded on demand, so the feature bundle is a separate chunk fetched after
  the page is interactive rather than part of what blocks it. Declared at
  module scope: an inline arrow would be a new function identity on every
  render and LazyMotion would re-run the import each time.
*/
const loadDomAnimation = () =>
  import("motion/react").then((mod) => mod.domAnimation);

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { clamp, resetScroll, setScroll } from "@/lib/scroll-store";

/**
 * MOTION PROVIDER
 *
 * One place owns scroll for the whole site. It does four jobs:
 *
 *  1. SMOOTH SCROLL. Lenis, tuned long and heavy — this is a page about weight,
 *     and scrolling it should feel like moving something with mass. Disabled
 *     outright under reduced motion, where native scrolling is the correct and
 *     expected behaviour.
 *
 *  2. THE STORE. ScrollTriggers write section progress into `scrollState`,
 *     which the WebGL scenes read every frame. Progress never becomes React
 *     state, so scrolling causes zero re-renders.
 *
 *  3. BALANCE. The single value the whole concept turns on. It runs 0 -> 1
 *     across the four valuation stages, so by the time the visitor has read
 *     "Complete the Exchange", the instrument has come to true — and so has
 *     every hairline rule on the page.
 *
 *  4. REVEALS. A single batched ScrollTrigger for everything marked
 *     `.will-reveal`, rather than one instance per element.
 *
 * Nothing here gates content. If this component never runs, every section is
 * still visible, readable and in document order — the CSS resting state is the
 * revealed state, and `.will-reveal` is only applied once JS has confirmed it
 * can un-apply it.
 */

type MotionContextValue = {
  scrollTo: (
    target: string | number,
    options?: { offset?: number; immediate?: boolean },
  ) => void;
  stop: () => void;
  start: () => void;
};

const MotionContext = createContext<MotionContextValue>({
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useMotion = () => useContext(MotionContext);

export function MotionProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const reducedRef = useRef(false);
  const pathname = usePathname();

  /*
    EFFECT A — THE PERSISTENT MACHINERY. Runs once for the life of the site
    layout: Lenis, the GSAP ticker, the pointer listener, and the one trigger
    whose element (documentElement) survives every navigation.

    EFFECT B, below, owns everything that queries the PAGE's DOM. The split is
    the fix for a real, confirmed bug: all of this used to live in one []-dep
    effect, which bound reveals, section progress, balance and parallax exactly
    once — against the first page's elements. After any client-side navigation
    the new page's .will-reveal content had no trigger and stayed invisible,
    the scenes' progress channels went dead, and returning to the homepage left
    the assay and finale scenes frozen. It looked like the site worked, because
    the FIRST page always did.
  */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    reducedRef.current = reduced;

    let lenis: Lenis | null = null;

    if (!reduced) {
      lenis = new Lenis({
        // Long and weighted. Anything snappier fights the subject matter.
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.92,
        touchMultiplier: 1.7,
        // Native scrolling on touch: smooth-scroll hijacking on a phone is the
        // fastest way to make a premium site feel broken.
        syncTouch: false,
      });

      lenisRef.current = lenis;

      lenis.on("scroll", (instance: { velocity: number }) => {
        setScroll({ velocity: instance.velocity });
        ScrollTrigger.update();
      });

      const raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // Cleanup handle for the ticker callback.
      (lenis as unknown as { __raf?: (t: number) => void }).__raf = raf;
    }

    // Whole-document progress: documentElement outlives every route, so this
    // belongs with the persistent machinery, not with the page triggers.
    const docTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setScroll({ progress: self.progress }),
    });

    let pointerRaf = 0;
    let pendingX = 0;
    let pendingY = 0;

    const flushPointer = () => {
      pointerRaf = 0;
      setScroll({ pointerX: pendingX, pointerY: pendingY });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pendingX = (event.clientX / window.innerWidth) * 2 - 1;
      pendingY = -((event.clientY / window.innerHeight) * 2 - 1);
      if (!pointerRaf) pointerRaf = requestAnimationFrame(flushPointer);
    };

    if (!reduced)
      window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      docTrigger.kill();
      window.removeEventListener("pointermove", onPointerMove);
      if (pointerRaf) cancelAnimationFrame(pointerRaf);

      const raf = (lenis as unknown as { __raf?: (t: number) => void } | null)
        ?.__raf;
      if (raf) gsap.ticker.remove(raf);
      lenis?.destroy();
      lenisRef.current = null;

      ScrollTrigger.getAll().forEach((t) => t.kill());
      resetScroll();
      delete document.documentElement.dataset.revealsReady;
    };
  }, []);

  /*
    EFFECT B — THE PAGE'S TRIGGERS. Re-runs on every pathname change, so each
    page's actual elements get their own triggers and the previous page's are
    reverted with it. Everything in here queries the DOM, which is exactly why
    none of it may live in the effect above.
  */
  useEffect(() => {
    const reduced = reducedRef.current;

    // The previous page's channels must not keep driving scenes and cursors
    // that now belong to different elements — or to none.
    setScroll({
      hero: 0,
      journey: 0,
      assay: 0,
      finale: 0,
      journeyStage: -1,
      assayFactor: -1,
    });

    const ctx = gsap.context(() => {
      const section = (name: string, key: "journey" | "assay" | "finale") => {
        const el = document.querySelector<HTMLElement>(
          `[data-scroll-section="${name}"]`,
        );
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => setScroll({ [key]: self.progress } as never),
        });
      };

      // The hero measures from its own top so the camera push tracks the
      // section leaving the viewport, not entering it.
      const hero = document.querySelector<HTMLElement>(
        '[data-scroll-section="hero"]',
      );
      if (hero) {
        ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => setScroll({ hero: self.progress }),
        });
      }

      section("journey", "journey");
      section("assay", "assay");
      section("finale", "finale");

      /* -------------------------------------------------------------- */
      /* BALANCE — the spine                                             */
      /* -------------------------------------------------------------- */

      const journey = document.querySelector<HTMLElement>(
        '[data-scroll-section="journey"]',
      );
      if (journey && !reduced) {
        /*
          `!reduced` is part of this condition because the trigger used to be
          created unconditionally — and its first onUpdate promptly clobbered
          the reduced-motion override (balance = 1, --beam-tilt: 0deg) set in
          the reduced branch below. A visitor who asked for no motion got the
          tilting hairlines anyway. Under reduced motion the rules rest level.
        */
        ScrollTrigger.create({
          trigger: journey,
          start: "top 80%",
          end: "bottom 60%",
          onUpdate: (self) => {
            const balance = clamp(self.progress);
            setScroll({ balance });

            // Level every hairline rule on the page in step with the object.
            // One write to a custom property; CSS does the rest, so this stays
            // off the main thread's layout path.
            document.documentElement.style.setProperty(
              "--beam-tilt",
              `${(-2.6 * (1 - balance)).toFixed(3)}deg`,
            );
          },
        });
      } else if (!journey) {
        // No instrument on this page: the rules rest level rather than holding
        // whatever tilt the previous page left behind.
        setScroll({ balance: 1 });
        document.documentElement.style.setProperty("--beam-tilt", "0deg");
      }

      /* -------------------------------------------------------------- */
      /* ACTIVE STAGE / FACTOR                                           */
      /* -------------------------------------------------------------- */

      document
        .querySelectorAll<HTMLElement>("[data-journey-stage]")
        .forEach((el, _i, all) => {
          const index = Number(el.dataset.journeyStage);
          ScrollTrigger.create({
            trigger: el,
            start: "top 62%",
            end: "bottom 38%",
            onToggle: (self) => {
              if (!self.isActive) return;
              setScroll({ journeyStage: index });

              /*
                The store value alone drove nothing visible for a long time —
                it was read by a needle that has since been retired. The rail
                beside the stages is CSS-only, so the active stage has to be
                expressed in the DOM for it to have anything to select on.

                Every stage is written on each toggle rather than just the two
                that changed: there are four of them, this fires a handful of
                times per page, and a diffing version would be the kind of
                cleverness that silently desyncs when someone adds a fifth.
              */
              all.forEach((node, i) => {
                node.dataset.active = i === index ? "true" : "false";
                node.dataset.passed = i < index ? "true" : "false";
              });
            },
          });
        });

      document
        .querySelectorAll<HTMLElement>("[data-assay-factor]")
        .forEach((el, _i, all) => {
          const index = Number(el.dataset.assayFactor);
          ScrollTrigger.create({
            trigger: el,
            start: "top 65%",
            end: "bottom 35%",
            onToggle: (self) => {
              if (!self.isActive) return;
              setScroll({ assayFactor: index });

              /*
                ACTIVE IS EXCLUSIVE, and it has to be written that way rather
                than each card minding its own flag.

                These ranges (top 65% -> bottom 35%) deliberately overlap so
                the scene's factor never blanks between cards. Each card
                setting only ITSELF meant two adjacent cards were commonly
                lit at the same time — reviewers reading the page cold filed
                it as "inconsistent enclosure: rows 02 and 03 are boxed,
                01 and 04 are not", which is what a four-item list looks like
                when two of the items think they are the current one.

                The 3D scene never showed the fault because scrollState holds
                a single index; only the DOM could be in two states at once.
              */
              all.forEach((node, i) => {
                node.dataset.active = i === index ? "true" : "false";
              });
            },
          });
        });

      /* -------------------------------------------------------------- */
      /* REVEALS                                                         */
      /* -------------------------------------------------------------- */

      if (!reduced) {
        // Tells the watchdog in the head script that reveals are armed, so it
        // does not un-hide everything three seconds from now.
        document.documentElement.dataset.revealsReady = "1";

        // :not(.reveal-done) — elements revealed on a previous visit to this
        // page in this session must not be re-hidden and re-animated.
        ScrollTrigger.batch(".will-reveal:not(.reveal-done)", {
          start: "top 88%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 1.15,
              ease: "power3.out",
              // A short stagger reads as considered; a long one reads as slow.
              stagger: 0.09,
              overwrite: true,
              onComplete: () =>
                batch.forEach((el) => el.classList.add("reveal-done")),
            });
          },
        });

        // Ornamental parallax. Restricted to elements explicitly opted in, and
        // capped at 60px of travel so nothing drifts out of its own section.
        document
          .querySelectorAll<HTMLElement>("[data-parallax]")
          .forEach((el) => {
            const distance = Number(el.dataset.parallax) || 40;
            gsap.fromTo(
              el,
              { y: -distance / 2 },
              {
                y: distance / 2,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.1,
                },
              },
            );
          });
      } else {
        // Reduced motion: everything is simply present.
        document
          .querySelectorAll<HTMLElement>(".will-reveal")
          .forEach((el) => el.classList.add("reveal-done"));
        document.documentElement.style.setProperty("--beam-tilt", "0deg");
        setScroll({ balance: 1 });
      }
    });

    // New page, new element positions — including font-metric shifts.
    ScrollTrigger.refresh();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
    };
  }, [pathname]);

  const scrollTo = useCallback(
    (
      target: string | number,
      options?: { offset?: number; immediate?: boolean },
    ) => {
      const offset = options?.offset ?? -84; // clears the fixed navigation

      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, {
          offset,
          immediate: options?.immediate,
        });
        return;
      }

      // Reduced motion / no Lenis: native, instant, no smooth behaviour.
      const el =
        typeof target === "string" ? document.querySelector(target) : null;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top, behavior: "auto" });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "auto" });
      }
    },
    [],
  );

  const stop = useCallback(() => lenisRef.current?.stop(), []);
  const start = useCallback(() => lenisRef.current?.start(), []);

  return (
    /*
      LAZYMOTION, AND THE REASON IS 62 KILOBYTES.

      Importing the full `motion` component pulls every feature Framer has —
      layout projection, drag, pan, scroll — into the shared chunk whether or
      not anything uses them. Measured on this site: First Load JS shared by
      all went 139 kB -> 201 kB, a 45% increase, on a page whose owner had
      already reported it as "not smooth and fast". That is a bad trade for a
      menu transition and a button press.

      LazyMotion ships a small core and loads a feature bundle asynchronously.
      `domAnimation` covers animations, variants, exit animations and the
      hover/tap/focus gestures — everything used here. `domMax` would add drag
      and layout projection; nothing on this site needs either, and taking the
      smaller bundle is the entire point.

      `strict` makes the saving enforceable rather than aspirational: it throws
      if anything in the tree renders `motion.*` instead of `m.*`, which is
      exactly the mistake that would silently reintroduce the full bundle and
      which no gate would otherwise catch.
    */
    <LazyMotion features={loadDomAnimation} strict>
      <MotionContext.Provider value={{ scrollTo, stop, start }}>
        {children}
      </MotionContext.Provider>
    </LazyMotion>
  );
}
