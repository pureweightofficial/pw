"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { detectCapability, type Capability } from "@/lib/capability";
import { useDocumentVisible } from "@/lib/hooks";
import {
  retainSharedResources,
  releaseSharedResources,
} from "../shared-resources";
import { setSceneQuality } from "../quality";
import { Dust } from "../Dust";
import { GoldMass } from "./GoldMass";
import { WorldCamera } from "./WorldCamera";
import { WorldLighting } from "./WorldLighting";

/**
 * ONE CANVAS, FOR THE WHOLE DOCUMENT.
 *
 * This replaces an architecture of five independent canvases that mounted and
 * unmounted as their sections scrolled past. That design existed for a real
 * reason — browsers cap the number of live WebGL contexts, and unmounting was
 * how the site stayed under the cap no matter how many sections wanted a scene.
 *
 * A single fixed canvas solves the same problem better: there is exactly one
 * context for the lifetime of the page, so the cap is unreachable by
 * construction, and the renderer, the environment map, the geometry and the
 * materials are all created once instead of five times. It is also the only way
 * to have continuity: an object cannot persist across sections if its canvas is
 * destroyed between them.
 *
 * It sits `fixed` behind the content at z-0, and every section surface above it
 * is translucent, so the same world shows through the entire page.
 */

/**
 * DRIVES THE WORLD AT ~30fps INSTEAD OF 60.
 *
 * The canvas runs `frameloop="demand"`, so nothing renders and no useFrame
 * callback fires until something asks. This asks, about thirty times a second.
 *
 * WHY. Measured on this page, the world costs roughly 15fps of scroll
 * smoothness. The interesting part is WHERE that goes: rendering the world
 * behind TRANSLUCENT surfaces and behind OPAQUE ones measured identically
 * (20.3/20.6fps against 20.6/20.7), so the bill is the renderer drawing a
 * full-viewport scene sixty times a second — not the compositing this
 * repository's older notes blamed. That older finding was measured on a
 * different scene and is corrected in scripts/check-perf.mjs.
 *
 * Which makes the fix available: this object drifts, settles and turns over
 * whole chapters of scrolling. Nothing in it moves fast enough for the
 * difference between 30 and 60 to be visible, and halving the draw calls is
 * the single largest saving on the table that costs the design nothing.
 *
 * The page's own motion is untouched — scroll, reveals, parallax and the
 * plumb line all still run at the display's full rate. Only the background
 * volume is sampled less often.
 */
function HalfRate() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let frame = 0;
    let last = 0;

    const pump = (now: number) => {
      // 32ms rather than 33.3: a hair under the budget, so a frame is never
      // skipped by rounding on a 60Hz display.
      if (now - last >= 32) {
        last = now;
        invalidate();
      }
      frame = requestAnimationFrame(pump);
    };

    frame = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);

  return null;
}

/** Whether the renderer should be drawing at all right now. */
function useShouldRender(): boolean {
  const visible = useDocumentVisible();
  return visible;
}

export function WorldCanvas() {
  const [capability, setCapability] = useState<Capability | null>(null);
  const [failed, setFailed] = useState(false);
  const shouldRender = useShouldRender();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setCapability(detectCapability());
  }, []);

  /*
    JOIN THE SHARED RESOURCE COUNT.

    GoldMass and WorldLighting draw goldMassGeometry, massGold, instrumentPlate
    and studioEnvMap from the memoised caches in geometry/materials/textures.
    Those caches are disposed by whoever puts the count back to zero, and until
    this effect existed the world was reading from them without ever being
    counted — so an unrelated SceneShell scene unmounting mid-page disposed the
    geometry and the environment map out from under a canvas that was still
    rendering, and the mass went black several chapters in.

    Quality tier is set here for the same reason SceneShell sets it: the
    factories bake the tier into what they build AND into their cache keys, so
    it has to be right before the first material is constructed, not after.
  */
  useEffect(() => {
    /*
      `failed` is deliberately part of this effect, not just the render guard.
      On a genuine context loss the component keeps rendering (as null), so it
      never unmounts — and an effect keyed only on capability would keep its
      retain held forever. The refcount would sit above zero for the rest of
      the session with no canvas alive, and "last one out disposes" would never
      fire again. With `failed` in the deps, the flip to true re-runs the
      effect: the previous cleanup releases, the new run early-returns without
      retaining, and the count is honest again.
    */
    if (!capability || capability.tier === "none" || failed) return;
    setSceneQuality(capability.tier);
    retainSharedResources();
    return releaseSharedResources;
  }, [capability, failed]);

  /*
    A LOST CONTEXT MUST NOT TAKE THE PAGE WITH IT.

    Browsers drop WebGL contexts for reasons that have nothing to do with this
    page — a GPU driver reset, a laptop switching graphics chips, too many tabs.
    Without this listener the canvas silently goes black and the site looks
    broken; with it, the poster underneath is simply what the visitor sees.
  */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    el.addEventListener("webglcontextlost", onLost);
    return () => el.removeEventListener("webglcontextlost", onLost);
  }, [capability]);

  /*
    THE WORLD IS FOR DEVICES THAT CAN CARRY IT, and "low" is not one of them.

    A full-viewport canvas is the most expensive thing this site can do, and
    unlike the windowed scenes it has no PerformanceMonitor to shed quality
    under load — it renders the whole screen for the whole session or not at
    all. Measured on a desktop it costs about ten frames; on hardware that
    already reports as low tier that is not a background, it is a stutter.

    lib/capability puts a phone with four cores or less, four gigabytes or
    less, or a coarse pointer on a small viewport into "low". Those devices
    get the painted gradient GoldWorld renders underneath this canvas, which
    is a finished look rather than a degraded one — the same rule every other
    scene on this site follows. The site's first principle here is not to
    overreach, and this is the one place where overreaching would be felt on
    every single scroll.

    If this should ship to phones after all, the honest way is to measure a
    real mid-range device rather than to widen the gate and hope.
  */
  if (
    !capability ||
    capability.tier === "none" ||
    capability.tier === "low" ||
    failed
  )
    return null;

  const high = capability.tier === "high";

  return (
    <Canvas
      ref={canvasRef}
      // Never the paint-blocking element: the DOM hero renders first and this
      // arrives underneath it.
      /*
        "demand", not "always": HalfRate below is the only thing that asks for
        a frame, and it asks thirty times a second. A backgrounded tab still
        stops entirely.
      */
      frameloop={shouldRender ? "demand" : "never"}
      /*
        0.85 of device resolution, capped. This is a soft-focus volume behind
        page content — there is no text in it, no hard edge that betrays a
        resample, and the mass's own surface detail is broad. Rendering ~28%
        fewer pixels for something nobody can point at is the cheapest frame
        on this page.
      */
      dpr={high ? [0.85, 1] : [0.75, 0.9]}
      shadows={false}
      gl={{
        antialias: high,
        alpha: true,
        powerPreference: "high-performance",
        // ACES is what stops bright metal clipping to flat white at the
        // highlight, which is the single most common way rendered gold turns
        // into a yellow sticker.
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.02,
      }}
      camera={{ position: [1.15, 1.72, 5.6], fov: 32, near: 0.1, far: 40 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <HalfRate />
      <WorldLighting capability={capability} />
      <WorldCamera reducedMotion={capability.reducedMotion} />
      <GoldMass capability={capability} />
      {/*
        ATMOSPHERE, and it is doing more work here than in any windowed scene.

        The world was lighting, a camera and one gold mass — nothing else in
        the volume at all. A single lit object floating in a void reads as an
        asset on a black page rather than as a room the page is happening
        inside, which is most of why the owner's verdict on it was "just a
        gold stone, very basic". Motes drifting through the key light give the
        space depth and scale, and they are what makes a slow camera move feel
        like a camera move rather than an object being resized.

        The volume is wider than a windowed scene's (sigma 2.6 against the
        finale's 1.15) because this one fills the viewport, and the count is
        tied to the device tier the same way every other particle budget here
        is. Opacity is deliberately low: this reads as air, not as snow, and
        it sits behind 81%-opaque surfaces where anything louder would show
        up as noise crawling under the text.
      */}
      <Dust
        count={Math.round(capability.particles * 0.75)}
        opacity={0.3}
        sigma={2.6}
        size={2.1}
      />
    </Canvas>
  );
}
