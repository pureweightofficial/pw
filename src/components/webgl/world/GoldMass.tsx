"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { chapterWindow, progressThrough } from "@/lib/chapters";
import { damp, scrollState } from "@/lib/scroll-store";
import { goldMassGeometry, weighPlatformGeometry } from "../geometry";
import { instrumentPlate, massGold } from "../materials";

/*
  THE WEIGHING PLATFORM IS OFF.

  Rendered, it read as two flat grazing-angle plates competing with the object
  it exists to support — it needs its own lighting pass, since the rig is tuned
  entirely for gold. It was previously "off" by setting a visibility factor to
  zero, which left it building a 96-segment lathe geometry, sitting in the scene
  graph, and taking five transform writes every frame to stay invisible.

  Off now means off. Flip this to re-enable it; the geometry, the placement and
  the settle-response are all still here and correct.
*/
const PLATFORM_ENABLED = false;

/**
 * THE ONE OBJECT.
 *
 * Everything the site says is said about this. It is never destroyed, never
 * swapped for a different mesh, and never duplicated — the visitor sees the
 * same lump of metal from the first frame to the last, which is the point the
 * brief makes hardest: continuity is what separates a story from a slideshow.
 *
 * MASS IS COMMUNICATED BY WHAT IT REFUSES TO DO.
 *
 * It does not spin. It does not bob. It does not spring. Across the entire
 * document it rotates a few degrees and translates less than its own width,
 * and it arrives at every position by deceleration rather than by easing curve.
 * A heavy object is one that is difficult to start and difficult to stop, so
 * the motion here is exponential damping toward a target — the same maths a
 * real damped mass obeys — rather than a keyframed tween.
 */

/**
 * Gold is not a colour. It is a metal with no diffuse term at all, which means
 * every value you see on it is something else in the room arriving second-hand.
 * The material therefore lives in the shared library beside the balance's
 * golds — `massGold()` — so the two objects on this page are demonstrably made
 * of the same stuff, and so the numbers that were wrong are documented next to
 * the numbers that were right.
 *
 * The one thing tuned per device here is environment intensity: weak tiers
 * render the room into a 128px cube whose blurred mips run slightly hotter, and
 * matching them costs one number rather than a second material.
 */
function useGoldMaterial(capability: Capability) {
  return useMemo(() => {
    const mat = massGold();
    mat.envMapIntensity = capability.tier === "high" ? 1.35 : 1.18;
    return mat;
  }, [capability.tier]);
}

export function GoldMass({ capability }: { capability: Capability }) {
  const group = useRef<THREE.Group>(null);
  const mass = useRef<THREE.Mesh>(null);
  const platform = useRef<THREE.Group>(null);
  const material = useGoldMaterial(capability);
  const plate = useMemo(
    () => (PLATFORM_ENABLED ? instrumentPlate() : null),
    [],
  );

  const geo = useMemo(() => goldMassGeometry(), []);
  const platformGeo = useMemo(
    () => (PLATFORM_ENABLED ? weighPlatformGeometry() : null),
    [],
  );

  // Live state, held in refs so nothing here ever triggers a React render.
  const state = useRef({ y: 0, rotY: 0, rotX: 0, px: 0, py: 0 });

  useFrame((_, delta) => {
    if (!group.current || !mass.current) return;
    const p = scrollState.progress;

    /*
      HEIGHT. The mass begins high and slightly out of frame, descends through
      the weight chapter until it rests on the platform, and stays down. It
      never rises again: gold that has been weighed does not float back up, and
      the stillness of the last chapters is what makes them read as resolved.
    */
    const settle = progressThrough("weight", p);
    // Cubic ease-out: fast while falling, almost stopped at contact. This is the
    // curve of something heavy arriving, not something light landing.
    const eased = 1 - Math.pow(1 - settle, 3);
    const restY = -0.28;
    /*
      0.34, not 1.15. At 1.15 the mass sat entirely ABOVE the viewport for the
      whole hero chapter, so the one frame every visitor certainly sees showed
      an empty black rectangle. The object might as well not have existed — and
      to anyone looking at the page, it did not. That is most of the reason this
      work kept reading as "no change".

      The brief asks for the opposite of absence: begin nearly black, reveal a
      thin warm edge, expose part of the surface. That needs the mass IN frame
      and mostly unlit, not out of frame and irrelevant. It still descends the
      same distance over the same chapter; it just starts where it can be seen.
    */
    const targetY = THREE.MathUtils.lerp(0.34, restY, eased);

    /*
      ROTATION. Eight degrees, total, across the whole page — the brief's
      ceiling, and it is generous. Most of it is spent turning the machined flat
      toward the camera for the purity chapter, so the one rotation the visitor
      gets is the one that shows them something.
    */
    const toPurity = progressThrough("purity", p);
    const targetRotY = THREE.MathUtils.degToRad(-4 + toPurity * 8);
    const targetRotX = THREE.MathUtils.degToRad(settle * 2.5);

    // Pointer influence: tiny, damped, and deliberately below conscious notice.
    // Mapping the cursor straight to rotation is what makes a scene feel like a
    // toy; this is closer to the object being lit from where you are standing.
    const px = scrollState.pointerX;
    const py = scrollState.pointerY;
    state.current.px = damp(state.current.px, px, 2.2, delta);
    state.current.py = damp(state.current.py, py, 2.2, delta);

    // 1.4 is a slow damping constant — roughly a second to close most of the
    // gap. Raising it is the fastest way to make several kilograms feel like a
    // beach ball, so it is deliberately the lowest value that still tracks.
    state.current.y = damp(state.current.y, targetY, 1.4, delta);
    state.current.rotY = damp(state.current.rotY, targetRotY, 1.1, delta);
    state.current.rotX = damp(state.current.rotX, targetRotX, 1.1, delta);

    group.current.position.y = state.current.y;
    group.current.position.x = state.current.px * 0.07;
    group.current.rotation.y = state.current.rotY + state.current.px * 0.02;
    group.current.rotation.x = state.current.rotX - state.current.py * 0.012;

    /*
      THE PLATFORM'S REACTION. When the mass lands, the platform gives by a
      fraction of a millimetre and recovers. It is far too small to see as
      movement and that is correct — it is felt as the surface acknowledging a
      load, which is the difference between an object resting on a plane and an
      object intersecting one.
    */
    if (PLATFORM_ENABLED && platform.current) {
      const shown = chapterWindow("weight", p, 0.22)
        + chapterWindow("purity", p, 0.3) * 0.6;
      platform.current.visible = shown > 0.01;
      const give = eased * 0.004;
      platform.current.position.y = restY - 0.52 - give;
      platform.current.scale.setScalar(0.9 + Math.min(1, shown) * 0.1);
    }
  });

  return (
    <group>
      {/*
        Two nested groups, deliberately. The OUTER one is static placement —
        right of centre and scaled to roughly half the frame — and the INNER one
        is the only thing useFrame touches. Writing both to one group means the
        per-frame position assignment silently erases the offset, which is a
        bug that presents as "the composition ignores its own layout".

        The placement itself comes from the brief: the copy column lives on the
        left and must never have metal behind it, and an object centred in frame
        reads as a product configurator rather than a photograph. Letting it run
        off the right edge is what makes the world feel bigger than the viewport.
      */}
      <group position={[0.92, 0, 0]} scale={0.63}>
        <group ref={group}>
          <mesh ref={mass} geometry={geo} material={material} />
        </group>
      </group>

      {/* The instrument the gold is measured on. Not mounted while disabled —
          an invisible mesh is still a mesh the renderer has to consider. */}
      {PLATFORM_ENABLED && platformGeo && plate ? (
        <group position={[0.92, 0, 0]} scale={0.63}>
          <group ref={platform} visible={false}>
            <mesh geometry={platformGeo} material={plate} />
          </group>
        </group>
      ) : null}
    </group>
  );
}
