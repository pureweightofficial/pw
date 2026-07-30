"use client";

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

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

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

    /* ---------------------------------------------------------------- */
    /* SECTION PROGRESS                                                  */
    /* ---------------------------------------------------------------- */

    const ctx = gsap.context(() => {
      // Whole-document progress.
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => setScroll({ progress: self.progress }),
      });

      const section = (
        name: string,
        key: "hero" | "journey" | "assay" | "finale",
      ) => {
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
      if (journey) {
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
      }

      /* -------------------------------------------------------------- */
      /* ACTIVE STAGE / FACTOR                                           */
      /* -------------------------------------------------------------- */

      document
        .querySelectorAll<HTMLElement>("[data-journey-stage]")
        .forEach((el) => {
          const index = Number(el.dataset.journeyStage);
          ScrollTrigger.create({
            trigger: el,
            start: "top 62%",
            end: "bottom 38%",
            onToggle: (self) => {
              if (self.isActive) setScroll({ journeyStage: index });
            },
          });
        });

      document
        .querySelectorAll<HTMLElement>("[data-assay-factor]")
        .forEach((el) => {
          const index = Number(el.dataset.assayFactor);
          ScrollTrigger.create({
            trigger: el,
            start: "top 65%",
            end: "bottom 35%",
            onToggle: (self) => {
              if (self.isActive) setScroll({ assayFactor: index });
              el.dataset.active = self.isActive ? "true" : "false";
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

        ScrollTrigger.batch(".will-reveal", {
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

    // Fonts change metrics, which changes every trigger position.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    /* ---------------------------------------------------------------- */
    /* POINTER                                                           */
    /* ---------------------------------------------------------------- */

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
      ctx.revert();
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
    <MotionContext.Provider value={{ scrollTo, stop, start }}>
      {children}
    </MotionContext.Provider>
  );
}
