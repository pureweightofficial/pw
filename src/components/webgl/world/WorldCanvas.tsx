"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { detectCapability, type Capability } from "@/lib/capability";
import { useDocumentVisible } from "@/lib/hooks";
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

  if (!capability || capability.tier === "none" || failed) return null;

  const high = capability.tier === "high";

  return (
    <Canvas
      ref={canvasRef}
      // Never the paint-blocking element: the DOM hero renders first and this
      // arrives underneath it.
      frameloop={shouldRender ? "always" : "never"}
      dpr={high ? [1, 1.25] : [1, 1]}
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
      <WorldLighting capability={capability} />
      <WorldCamera reducedMotion={capability.reducedMotion} />
      <GoldMass capability={capability} />
    </Canvas>
  );
}
