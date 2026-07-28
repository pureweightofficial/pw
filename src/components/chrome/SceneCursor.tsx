'use client';

import { useEffect, useRef } from 'react';

/**
 * SCENE CURSOR
 *
 * A thin gold ring that appears only over the WebGL surfaces, carrying a small
 * label so the visitor knows the scene responds to them. Everywhere else the
 * native cursor is untouched.
 *
 * The restraint is the design. The brief was explicit that the cursor must not
 * be replaced by a large decorative object, and a custom cursor that follows
 * you across an entire site is the most common way an "immersive" build becomes
 * tiring — it makes every ordinary click feel slightly wrong. So this is scoped
 * to three specific rectangles and nothing else.
 *
 * It never gates anything:
 *  - fine pointers only, and never under reduced motion;
 *  - suppressed over any real control, so a link never loses its pointer;
 *  - suppressed over marked copy blocks, since text wants a text cursor;
 *  - position written straight to the node inside rAF — no React state, so it
 *    cannot cost a re-render;
 *  - if this component never mounts, nothing about the page changes.
 */

const INTERACTIVE = 'a, button, input, textarea, select, label, summary, [role="button"]';

export function SceneCursor() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    const ring = ringRef.current;
    if (!ring) return;

    const label = ring.querySelector<HTMLSpanElement>('[data-ring-label]');

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let visible = false;
    let primed = false;

    const hide = () => {
      if (!visible) return;
      visible = false;
      ring.style.opacity = '0';
      ring.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(0.6)`;
      document.documentElement.style.cursor = '';
    };

    const tick = () => {
      // Trails the pointer slightly. Enough to read as weighted, not enough to
      // feel disconnected from the hand moving it.
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      ring.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) scale(1)`;

      if (visible) raf = requestAnimationFrame(tick);
      else raf = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      const element = event.target as HTMLElement | null;

      // Real controls and marked copy keep the native cursor.
      if (element?.closest(INTERACTIVE) || element?.closest('[data-cursor-normal]')) {
        hide();
        return;
      }

      // Hit-test against the registered surfaces by rectangle, because the
      // canvases sit behind their own overlays and would rarely be the event
      // target directly.
      const surfaces = document.querySelectorAll<HTMLElement>('[data-webgl-surface]');
      let match: HTMLElement | null = null;

      for (const surface of surfaces) {
        const rect = surface.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          match = surface;
          break;
        }
      }

      if (!match) {
        hide();
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;

      if (!primed) {
        // Place it under the pointer on first appearance rather than flying in
        // from the last position.
        currentX = targetX;
        currentY = targetY;
        primed = true;
      }

      if (!visible) {
        visible = true;
        ring.style.opacity = '1';
        document.documentElement.style.cursor = 'none';
        if (!raf) raf = requestAnimationFrame(tick);
      }

      if (label) {
        const next = match.dataset.webglLabel ?? '';
        if (label.textContent !== next) label.textContent = next;
        label.style.opacity = next ? '1' : '0';
      }
    };

    const onLeave = () => {
      primed = false;
      hide();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('scroll', hide, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('scroll', hide);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.cursor = '';
    };
  }, []);

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden opacity-0 transition-opacity duration-300 lg:block"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="h-9 w-9 rounded-full border border-gold-rich/70" />
        <div className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-high" />
        <span
          data-ring-label
          className="absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 whitespace-nowrap text-[0.55rem] tracking-[0.28em] text-gold-high uppercase opacity-0 transition-opacity duration-300"
        />
      </div>
    </div>
  );
}
