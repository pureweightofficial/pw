"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useMotion } from "@/components/motion/MotionProvider";
import { useFocusTrap, useScrollLock } from "@/lib/hooks";
import { brand, navCta, primaryNav } from "@/lib/site";

/**
 * NAVIGATION
 *
 * Transparent over the hero, then a smoked-glass plate with a gold hairline
 * once the visitor has moved. No dropdowns — the site's information
 * architecture is shallow enough not to need them, and a mega-menu on a private
 * valuation business would be the wrong kind of loud.
 *
 * Accessibility carried the design decisions here as much as aesthetics: a skip
 * link ahead of everything, a real `<nav>` with a landmark label, `aria-current`
 * on the active route, the mobile panel as a focus-trapped dialog that returns
 * focus on close, and a valuation CTA that is reachable at every breakpoint
 * without opening a menu.
 *
 * THE PANEL IS THE SITE'S ONE FRAMER MOTION SURFACE, and it is here because it
 * is the one thing GSAP could not reasonably own. The panel used to toggle on
 * the `hidden` attribute: it appeared and vanished on a single frame, with no
 * transition at all, on a site whose every other surface eases over 500-1500ms.
 * It was the least considered moment on the phone experience.
 *
 * An exit animation needs the element to stay mounted after React has decided
 * it should go, which is exactly the problem AnimatePresence exists to solve
 * and exactly the problem a scroll-driven timeline library does not address.
 * GSAP keeps everything scroll-linked — the reveals, the parallax, and the
 * channels the WebGL scenes read; see MotionProvider. The two do not overlap.
 */

export function Nav() {
  const pathname = usePathname();
  const { scrollTo, stop, start } = useMotion();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /*
    The site's motion discipline, not Framer's default. `useReducedMotion`
    reads the same media query MotionProvider does, and every variant below
    collapses to a plain opacity change when it is set — the panel still
    arrives and still leaves, it simply does not travel.
  */
  const reduced = useReducedMotion();

  useScrollLock(menuOpen);
  const panelRef = useFocusTrap<HTMLDivElement>(menuOpen);

  // Lenis keeps scrolling underneath an open overlay unless it is told not to.
  useEffect(() => {
    if (menuOpen) stop();
    else start();
  }, [menuOpen, stop, start]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 48);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the panel whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    // Same-page anchors are handed to Lenis so they inherit the site's easing
    // rather than jumping.
    if (href.startsWith("/#") && pathname === "/") {
      event.preventDefault();
      setMenuOpen(false);
      scrollTo(href.slice(1));
    } else {
      setMenuOpen(false);
    }
  };

  const isActive = (href: string) =>
    href.startsWith("/#")
      ? false
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:bg-char focus:px-5 focus:py-3 focus:text-[0.7rem] focus:tracking-[0.2em] focus:text-gold-pale focus:uppercase focus:outline focus:outline-1 focus:outline-gold-rich"
      >
        Skip to main content
      </a>

      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500",
          scrolled
            ? "border-b border-gold-antique/22 bg-void/82 backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        ].join(" ")}
      >
        <nav
          aria-label="Primary"
          className="shell flex h-[var(--nav-h)] items-center justify-between gap-6"
        >
          <Link
            href="/"
            aria-label={`${brand.name} — home`}
            className="flex shrink-0 items-center transition-opacity duration-300 hover:opacity-85"
          >
            {/* The supplied artwork, windowed per breakpoint — see Logo.tsx.
                Colours are untouched. */}
            <Logo
              variant="wordmark"
              priority
              className="hidden h-10 lg:block"
            />
            <Logo variant="monogram" className="h-10 lg:hidden" />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={(e) => handleNavClick(e, item.href)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href={navCta.href}
              // min-h-11 = 44px. The padding alone gave ~32px, which is below
              // the minimum comfortable touch target on the tablet widths this
              // is visible at.
              className="hidden min-h-11 items-center border border-gold-antique/55 px-5 text-[0.64rem] font-medium tracking-[0.2em] text-gold-pale uppercase transition-colors duration-300 hover:border-gold-rich hover:bg-gold-antique/12 sm:inline-flex"
            >
              {navCta.label}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="pw-mobile-menu"
              className="flex h-11 w-11 items-center justify-center border border-gold-antique/30 text-gold-antique transition-colors duration-300 hover:border-gold-rich lg:hidden"
            >
              <span className="sr-only">
                {menuOpen ? "Close menu" : "Open menu"}
              </span>
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                    menuOpen ? "top-1.5 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-200 ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                    menuOpen ? "top-1.5 -rotate-45" : "top-3"
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>

        {/* The hairline under the bar is the beam motif at its most restrained.
            It stays level here — a tilted rule under the navigation would read
            as a rendering fault rather than as the concept. */}
        <div
          className={`beam beam-fixed transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`}
        />
        {/* Content dissolves into the bar rather than being sliced by its
            edge. Sits outside the <nav> and below the bar, so it covers the
            page and never the navigation's own controls. */}
        <div
          aria-hidden="true"
          className={`nav-fade pointer-events-none absolute inset-x-0 top-full transition-opacity duration-500 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
      </header>

      {/* ---- Mobile panel ---- */}
      {/*
        AnimatePresence keeps the panel mounted through its exit, which is the
        whole reason it is here. `hidden={!menuOpen}` is gone: the attribute
        both hid the panel and removed it from the accessibility tree, so
        there was nothing to animate out of and nothing to animate into.
        Conditional mounting does the same job and lets the exit run.
      */}
      <AnimatePresence>
        {menuOpen ? (
      <m.div
        id="pw-mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
        transition={{
          // The site's own settle curve, the one every CSS transition here
          // uses: cubic-bezier(0.16, 1, 0.3, 1).
          duration: reduced ? 0.2 : 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="fixed inset-0 z-40 flex flex-col bg-void/97 backdrop-blur-lg lg:hidden"
      >
        {/* The dialog's own close control — INSIDE the aria-modal region and the
            focus trap. The header hamburger also closes the menu, but it sits
            outside both, so a screen-reader user inside the dialog previously
            had no discoverable way out other than Escape. */}
        <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-end">
          <div className="shell flex justify-end">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-11 min-w-11 items-center justify-center gap-2 border border-gold-antique/40 px-4 text-[0.62rem] font-medium tracking-[0.22em] text-gold-antique uppercase transition-colors duration-300 hover:border-gold-rich hover:text-gold-high"
            >
              Close
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="shell flex flex-1 flex-col justify-between overflow-y-auto pb-10 pt-8">
          {/*
            The links arrive after the panel, one behind the next. A stagger is
            the cheapest way to make an overlay read as composed rather than
            dumped — and it is a genuine chore by hand, which is most of why
            this menu had no motion at all before.
          */}
          <m.ul
            className="flex flex-col"
            initial="hidden"
            animate="shown"
            variants={{
              shown: {
                transition: { staggerChildren: reduced ? 0 : 0.055, delayChildren: 0.12 },
              },
            }}
          >
            {primaryNav.map((item, index) => (
              <m.li
                key={item.href}
                className="border-b border-gold-antique/12"
                variants={{
                  hidden: reduced
                    ? { opacity: 0 }
                    : { opacity: 0, y: 14 },
                  shown: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: reduced ? 0.2 : 0.5, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
              >
                <Link
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="flex items-baseline gap-4 py-5 font-display text-3xl text-ivory transition-colors duration-300 hover:text-gold-high"
                >
                  <span className="font-sans text-[0.6rem] tracking-[0.24em] text-gold-antique">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                </Link>
              </m.li>
            ))}
          </m.ul>

          <div className="mt-10 flex flex-col gap-5">
            <Link
              href={navCta.href}
              className="btn-primary w-full justify-center"
            >
              <span className="relative z-10">{navCta.label}</span>
            </Link>
            <div className="flex items-center gap-4">
              <Logo variant="monogram" className="h-11 shrink-0" />
              <p className="text-[0.72rem] leading-relaxed text-ash">
                {brand.positioning}
              </p>
            </div>
          </div>
        </div>
      </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
