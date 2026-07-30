'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { useMotion } from '@/components/motion/MotionProvider';
import { useFocusTrap, useScrollLock } from '@/lib/hooks';
import { brand, navCta, primaryNav } from '@/lib/site';

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
 */

export function Nav() {
  const pathname = usePathname();
  const { scrollTo, stop, start } = useMotion();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the panel whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Same-page anchors are handed to Lenis so they inherit the site's easing
    // rather than jumping.
    if (href.startsWith('/#') && pathname === '/') {
      event.preventDefault();
      setMenuOpen(false);
      scrollTo(href.slice(1));
    } else {
      setMenuOpen(false);
    }
  };

  const isActive = (href: string) =>
    href.startsWith('/#') ? false : pathname === href || pathname.startsWith(`${href}/`);

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
          'fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500',
          scrolled
            ? 'border-b border-gold-antique/22 bg-void/82 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        ].join(' ')}
      >
        <nav aria-label="Primary" className="shell flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={`${brand.name} — home`}
            className="flex shrink-0 items-center transition-opacity duration-300 hover:opacity-85"
          >
            {/* The supplied artwork, windowed per breakpoint — see Logo.tsx.
                Colours are untouched. */}
            <Logo variant="wordmark" priority className="hidden h-10 lg:block" />
            <Logo variant="monogram" className="h-10 lg:hidden" />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-link"
                  aria-current={isActive(item.href) ? 'page' : undefined}
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
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-200 ${
                    menuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ${
                    menuOpen ? 'top-1.5 -rotate-45' : 'top-3'
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
          className={`beam beam-fixed transition-opacity duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
        />
      </header>

      {/* ---- Mobile panel ---- */}
      <div
        id="pw-mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!menuOpen}
        className="fixed inset-0 z-40 flex flex-col bg-void/97 backdrop-blur-lg lg:hidden"
      >
        <div className="h-[var(--nav-h)] shrink-0" />

        <div className="shell flex flex-1 flex-col justify-between overflow-y-auto pb-10 pt-8">
          <ul className="flex flex-col">
            {primaryNav.map((item, index) => (
              <li key={item.href} className="border-b border-gold-antique/12">
                <Link
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="flex items-baseline gap-4 py-5 font-display text-3xl font-semibold text-ivory transition-colors duration-300 hover:text-gold-high"
                >
                  <span className="font-sans text-[0.6rem] tracking-[0.24em] text-gold-antique">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-5">
            <Link href={navCta.href} className="btn-primary w-full justify-center">
              <span className="relative z-10">{navCta.label}</span>
            </Link>
            <div className="flex items-center gap-4">
              <Logo variant="monogram" className="h-11 shrink-0" />
              <p className="text-[0.72rem] leading-relaxed text-ash">{brand.positioning}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
