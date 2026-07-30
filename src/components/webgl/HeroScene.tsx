'use client';

import { ContactShadows } from '@react-three/drei';
import type { Capability } from '@/lib/capability';
import { BalanceScale } from './BalanceScale';
import { CameraRig } from './CameraRig';
import { Dust } from './Dust';
import { benchGeometry } from './geometry';
import { benchSurface } from './materials';
import { Studio } from './Studio';

/**
 * HERO SCENE — the establishing shot
 *
 * The full instrument on a dark bench, opening a couple of degrees out of true
 * and settling as the visitor scrolls. The composition deliberately seats the
 * scale low and slightly right of centre: the headline occupies the upper-left
 * negative space, and no body copy ever lands on top of the ornamental beam.
 */

export function HeroScene({ capability }: { capability: Capability }) {
  const compact = capability.coarsePointer;

  return (
    <group position={[0, -1.15, 0]}>
      <Studio capability={capability} />
      <CameraRig mode="hero" capability={capability} compact={compact} />

      {/* The bench. Present only when it can actually receive a shadow —
          otherwise it is an invisible plane costing a full-screen fill. */}
      {capability.shadows ? (
        <mesh
          geometry={benchGeometry()}
          material={benchSurface()}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.002, 0]}
          receiveShadow
        />
      ) : (
        <ContactShadows
          position={[0, 0.004, 0]}
          opacity={0.7}
          scale={9}
          blur={2.6}
          far={3.2}
          resolution={128}
          frames={1}
          color="#000000"
        />
      )}

      {/*
        Yawed to a true three-quarter view and seated right of centre —
        screenshot-verified fixes, both. Dead-on frontal, the beam's lens face
        filled the frame width and read as a giant flat blade rather than a
        thin instrument arm; yawing ~19 degrees foreshortens it into a bar and
        gives the whole object depth. The x-shift clears it out of the
        headline column, per the original composition brief.
      */}
      <group position={[0.55, 0, 0]} rotation={[0, -0.34, 0]}>
        <BalanceScale capability={capability} mode="hero" />
      </group>

      <Dust count={capability.particles} opacity={0.42} sigma={1.55} />
    </group>
  );
}
