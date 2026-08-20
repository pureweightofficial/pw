'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectCapability, type Capability } from './capability';

/**
 * Capability, resolved after mount.
 *
 * Returns `null` on the server and on the very first client render, so nothing
 * that depends on GPU/motion capability can cause a hydration mismatch. Callers
 * render their static fallback until this resolves — which is also the correct
 * loading state, so there is no flash of empty canvas.
 */
export function useCapability(): Capability | null {
  const [capability, setCapability] = useState<Capability | null>(null);

  useEffect(() => {
    setCapability(detectCapability());
  }, []);

  return capability;
}

/** Live `prefers-reduced-motion`, including changes made while the tab is open. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * True while the element is anywhere near the viewport.
 *
 * Used to stop rendering WebGL scenes that have scrolled away — the single
 * biggest saving available, since an off-screen canvas otherwise keeps its
 * render loop running at full cost.
 */
export function useInViewport<T extends Element>(
  rootMargin = '200px',
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}

/** True while the document is visible. Pairs with viewport gating. */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

/*
  useMagnetic lived here: a requestAnimationFrame loop easing toward the cursor
  with `current += (target - current) * 0.14`, applied through a ref.

  It is GONE rather than parked, because dead code that looks live is a trap
  this repo has documented several times — the obvious way to "restore" a
  magnetic button would have been to reach for this again, re-introducing a
  second, differently-tuned implementation alongside the real one.

  Its replacement is useMagneticSpring in components/ui/primitives.tsx, which
  does the same job on a real spring: it carries velocity, so a fast sweep
  lags and catches up where the fixed-rate lerp always moved at one speed. The
  restraint is unchanged — 6px, mouse pointers only, nothing under reduced
  motion.
*/

/** Locks body scroll (mobile menu). Restores the exact previous scroll position. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

/** Focus trap for the mobile menu and any modal surface. */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = ref.current;
    if (!root) return;

    const focusable = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.querySelector<HTMLElement>('button, a[href], input')?.focus();

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, onKeyDown]);

  return ref;
}
