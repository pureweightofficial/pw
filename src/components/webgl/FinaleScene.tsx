"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { clamp, scrollState, smoothstep } from "@/lib/scroll-store";
import { BalanceScale } from "./BalanceScale";
import { CameraRig } from "./CameraRig";
import { Dust } from "./Dust";
import { Studio } from "./Studio";

/**
 * FINALE SCENE — the resolution
 *
 * A closer, warmer read of the same instrument, arriving at true. Two rules
 * from the brief shape it, and both are about knowing when to stop:
 *
 *  - the scale settles and then HOLDS. No re-run while the section is on
 *    screen. A balance that keeps re-swinging is a balance that has not
 *    settled, and the section's entire claim is that it has;
 *  - one warm reflection travels across the beam at the moment of balance, and
 *    only then. It is the single piece of pure ornament in the scene, and it
 *    earns its place by firing exactly once.
 */

/**
 * The reflection pass: a narrow warm light that sweeps the beam once, when
 * balance is reached, then parks itself and stops costing anything.
 */
function ReflectionSweep({ enabled }: { enabled: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const state = useRef({ played: 0, done: false });

  useFrame((_, rawDelta) => {
    const light = lightRef.current;
    if (!light || !enabled) return;

    const s = state.current;

    // Arms only once the scale is essentially level.
    const armed = scrollState.finale > 0.62;

    if (armed && !s.done) {
      s.played = Math.min(1, s.played + Math.min(rawDelta, 0.05) * 0.42);
      if (s.played >= 1) s.done = true;
    }

    if (s.played <= 0) {
      light.intensity = 0;
      return;
    }

    const t = s.played;
    // Travels left to right across the beam.
    light.position.x = THREE.MathUtils.lerp(-2.4, 2.4, t);
    // Brightest at the centre of the pass, silent at both ends.
    light.intensity = Math.sin(Math.PI * t) * 16;
  });

  if (!enabled) return null;

  return (
    <pointLight
      ref={lightRef}
      position={[-2.4, 2.05, 1.5]}
      intensity={0}
      distance={4.2}
      decay={2}
      color="#ffe9a8"
    />
  );
}

/** Fades the whole instrument up as the section arrives, rather than cutting. */
function SectionFade({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const t = smoothstep(clamp(scrollState.finale * 2.4));
    group.scale.setScalar(0.965 + t * 0.035);
  });

  return <group ref={groupRef}>{children}</group>;
}

export function FinaleScene({ capability }: { capability: Capability }) {
  const compact = capability.coarsePointer;

  return (
    /*
      COMPOSED BY ARITHMETIC, because two rounds of eyeballing it got it
      wrong in both directions.

      THE NUMBERS. BalanceScale puts its beam pivot at local y = PIVOT_Y =
      1.86. FINALE_PATH aims the camera at world y ~1.62 from ~4.64 units
      back at fov 30, so the frame covers 2.49 world units of height — about
      361px per unit at 900px tall, centred on 1.62.

      With the group at -1.28 the pivot sat at world 0.58: a full world unit
      BELOW the point the lens was aimed at, i.e. ~380px below frame centre,
      which put the beam at the very bottom edge and the pans off-screen
      entirely. That is the whole reason this section read as "nearly black"
      — under the old scrim the one sliver still in frame was also the part
      painted over. Fixing the scrim revealed the framing fault underneath it.

      THE WHOLE INSTRUMENT HAS TO FIT, not just the interesting part of it.

      BalanceScale runs from a plinth at local y ~0 to a beam pivot at 1.86,
      with pans hanging to ~1.24 — call it 2.0 units tall and 3.24 wide at the
      beam. The frame is 2.49 units tall and 3.98 wide. So the instrument can
      only ever be whole at a scale around 0.42, and every larger value crops
      it somewhere: 0.8 ran the beam past both frame edges, 0.46 fitted the
      beam and pans but left the pillar and foot below the section's bottom
      edge, which is what three reviews called "amputated".

      0.42 with the group lifted to +0.46 puts the plinth at world 0.46 —
      screen ~869, just inside the section — and the pivot at 1.24, screen
      ~587, below the copy block that now sits in the upper portion of the
      section. Beam half-span 0.68 world, so the pans land at screen 475 and
      965, well clear of both edges. Whole, and standing on its own base.
    */
    <group position={[0, 0.46, 0]} scale={0.42}>
      <Studio capability={capability} intimate />
      <CameraRig mode="finale" capability={capability} compact={compact} />

      <SectionFade>
        <BalanceScale capability={capability} mode="finale" />
      </SectionFade>

      <ReflectionSweep enabled={!capability.reducedMotion} />

      {/* Half the hero's dust: this frame is tighter, and the same density
          would read as smoke rather than atmosphere. */}
      <Dust
        count={Math.round(capability.particles * 0.5)}
        opacity={0.36}
        sigma={1.15}
      />
    </group>
  );
}
