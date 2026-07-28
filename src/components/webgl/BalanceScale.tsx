'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Capability } from '@/lib/capability';
import { clamp, damp, scrollState } from '@/lib/scroll-store';
import * as G from './geometry';
import * as M from './materials';

/**
 * THE BALANCE
 *
 * The instrument is the argument. Everything about how it is built and how it
 * moves is meant to say "measured, not guessed":
 *
 *  - It opens fractionally out of true (-2.6°) and comes level as the visitor
 *    reads the page. The tilt is driven by `scrollState.balance`, the same
 *    value that levels every hairline divider in the HTML — so the object and
 *    the layout resolve together.
 *  - The pans are hung, not welded. Each hangs from a spring-damped joint that
 *    keeps it level under the tilting beam and overshoots very slightly, the
 *    way real suspended mass does. That single detail is most of the weight.
 *  - Nothing loops. Once balance is reached the instrument holds still, because
 *    a scale that keeps re-swinging is a scale that has not settled, and the
 *    whole message is that it has.
 */

const BEAM_HALF = 1.62;
const PIVOT_Y = 1.86;
const HANGER_DROP = 0.62;
const PAN_RADIUS = 0.54;
const CHAIN_RADIUS = 0.4;

/** Opening tilt. Small enough to read as "settling", not "broken". */
const REST_TILT = THREE.MathUtils.degToRad(-2.6);

/**
 * Forward offsets for the instrument face and pointer.
 *
 * Both are dictated by the column's turned collar, which reaches a radius of
 * 0.206 at exactly the height the graduation arc occupies. The plate must clear
 * that, and the pointer must clear both the collar and the plate face.
 */
const GRADUATION_Z = 0.26;
const POINTER_Z = 0.31;

export type ScaleMode = 'hero' | 'finale' | 'still';

/* -------------------------------------------------------------------------- */
/* SHARED BEAM STATE                                                          */
/* Beam and hangers communicate through a plain mutable object rather than     */
/* React state — this is read and written every frame.                        */
/* -------------------------------------------------------------------------- */

type BeamState = { tilt: number; settled: boolean };

/* -------------------------------------------------------------------------- */
/* CHAINS                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Three chains per pan, instanced as one draw call. Link transforms are solved
 * once on mount: the chains themselves are rigid, and all their motion comes
 * from the hanger swinging above them — which is what actually happens on a
 * real balance, and costs nothing per frame.
 */
function Chains({ links = 10 }: { links?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const total = 3 * links;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const axis = new THREE.Vector3(0, 0, 1);
    const flip = new THREE.Vector3(1, 0, 0);
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const point = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    let index = 0;

    for (let c = 0; c < 3; c += 1) {
      const theta = (c / 3) * Math.PI * 2 + Math.PI / 6;
      end.set(Math.cos(theta) * CHAIN_RADIUS, -HANGER_DROP, Math.sin(theta) * CHAIN_RADIUS);
      dir.copy(end).sub(start).normalize();
      quat.setFromUnitVectors(axis, dir);

      for (let l = 0; l < links; l += 1) {
        const t = (l + 0.5) / links;
        point.copy(start).lerp(end, t);
        // A shallow catenary — a chain under light load is nearly straight, and
        // over-sagging it would read as rope.
        point.y -= Math.sin(Math.PI * t) * 0.011;

        dummy.position.copy(point);
        dummy.quaternion.copy(quat);
        // Alternate links sit at 90° to their neighbours.
        if (l % 2 === 1) dummy.rotateOnAxis(flip, Math.PI / 2);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [links]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[G.chainLinkGeometry(), M.chainSteel(), total]}
      castShadow
      frustumCulled={false}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* CARGO                                                                      */
/* -------------------------------------------------------------------------- */

/** Three cast bars, stacked the way bars actually stack: not perfectly square. */
function BullionStack() {
  const bar = G.ingotGeometry();
  const gold = M.bullionGold();

  return (
    <group position={[0, 0.026, 0]}>
      <mesh
        geometry={bar}
        material={gold}
        position={[-0.088, 0, 0.014]}
        rotation={[0, -0.07, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={bar}
        material={gold}
        position={[0.088, 0, -0.018]}
        rotation={[0, 0.1, 0]}
        castShadow
        receiveShadow
      />
      <group position={[0, 0.066, -0.002]} rotation={[0, 0.44, 0]}>
        <mesh geometry={bar} material={gold} castShadow receiveShadow />
        {/* The struck face. A separate plane so the stamp lands square on the
            top of the bar instead of being smeared by the extrusion's UVs. */}
        <mesh
          geometry={G.stampPlaneGeometry()}
          material={M.stampedGold()}
          position={[0, 0.0665, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>
    </group>
  );
}

/**
 * The counterweight: a sealed valuation block.
 *
 * The brief was explicit that banknotes make a gold business read as a pawn
 * shop, so the opposite pan carries settled value in the abstract — a dense
 * dark block, banded in gold, closed with a struck seal. Formal, heavy, and
 * carrying no currency signal at all.
 */
function SealBlock() {
  return (
    <group position={[0, 0.024, 0]}>
      <mesh geometry={G.sealBlockGeometry()} material={M.sealStone()} castShadow receiveShadow />
      {/* Banding, struck around the block like a bullion strap. */}
      <mesh geometry={G.sealBandGeometry()} material={M.engravedGold()} position={[0, 0.062, 0]} />
      <mesh
        geometry={G.sealBandGeometry()}
        material={M.engravedGold()}
        position={[0, 0.148, 0]}
        scale={[1, 0.62, 1]}
      />
      {/* The seal itself. */}
      <mesh position={[0, 0.204, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.056, 0.016, 28]} />
        <primitive object={M.polishedGold()} attach="material" />
      </mesh>
      <mesh position={[0, 0.213, 0]}>
        <torusGeometry args={[0.038, 0.005, 8, 28]} />
        <primitive object={M.antiqueGold()} attach="material" />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* HANGER                                                                     */
/* -------------------------------------------------------------------------- */

type HangerProps = {
  side: -1 | 1;
  cargo: 'bullion' | 'seal';
  beam: BeamState;
  capability: Capability;
};

/**
 * A suspended pan assembly.
 *
 * The swing group counter-rotates the beam so the pan hangs level — that is not
 * a trick, it is what a gimballed pan does — and reaches that angle through a
 * spring-damper rather than instantly, so the pan lags and settles instead of
 * snapping. Stiffness and damping are tuned for a heavy, slow, overdamped feel:
 * one small overshoot, then rest.
 */
function Hanger({ side, cargo, beam, capability }: HangerProps) {
  const swingRef = useRef<THREE.Group>(null);
  const chainLagRef = useRef<THREE.Group>(null);

  const motion = useRef({ angle: 0, velocity: 0, lag: 0 });
  const physics = capability.chainPhysics;

  useFrame((_, rawDelta) => {
    const swing = swingRef.current;
    if (!swing) return;

    // Clamp delta: returning to a backgrounded tab otherwise delivers a single
    // enormous step that would fling the pans.
    const dt = Math.min(rawDelta, 0.05);
    const state = motion.current;

    // Keeping the pan level means matching the beam's rotation in reverse.
    let target = -beam.tilt;

    if (physics) {
      // A gentle response to the pointer, and to how fast the page is moving.
      target += scrollState.pointerX * 0.014 * side;
      target += clamp(scrollState.velocity * 0.0006, -0.02, 0.02) * side;
    }

    if (capability.reducedMotion) {
      swing.rotation.z = target;
      if (chainLagRef.current) chainLagRef.current.rotation.z = 0;
      return;
    }

    // Spring-damper. Stiffness 58 / damping 9.4 gives a single small overshoot
    // and a ~1.2s settle — heavy brass, not a pendulum toy.
    const stiffness = 58;
    const damping = 9.4;
    state.velocity += (target - state.angle) * stiffness * dt;
    state.velocity -= state.velocity * damping * dt;
    state.angle += state.velocity * dt;

    swing.rotation.z = state.angle;

    // The chains trail the pan by a few milliseconds.
    if (chainLagRef.current) {
      state.lag = damp(state.lag, (target - state.angle) * 0.55, 9, dt);
      chainLagRef.current.rotation.z = state.lag;
    }
  });

  return (
    <group position={[side * BEAM_HALF, 0, 0]}>
      {/* Suspension eye, fixed to the beam tip. */}
      <mesh
        geometry={G.suspensionEyeGeometry()}
        material={M.polishedGold()}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      />

      <group ref={swingRef}>
        <group ref={chainLagRef}>
          <Chains links={capability.tier === 'low' ? 7 : 10} />
        </group>

        <group position={[0, -HANGER_DROP - 0.02, 0]}>
          <mesh
            geometry={G.panGeometry(PAN_RADIUS)}
            material={M.antiqueGold()}
            castShadow
            receiveShadow
          />
          {/* Engraved rim band — the ornament from the emblem, at pan scale. */}
          <mesh position={[0, 0.118, 0]}>
            <cylinderGeometry args={[PAN_RADIUS * 0.995, PAN_RADIUS * 0.995, 0.026, 64, 1, true]} />
            <primitive object={M.engravedGold()} attach="material" />
          </mesh>

          {cargo === 'bullion' ? <BullionStack /> : <SealBlock />}
        </group>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* THE INSTRUMENT                                                             */
/* -------------------------------------------------------------------------- */

export type BalanceScaleProps = {
  capability: Capability;
  mode?: ScaleMode;
  /** Multiplies the opening tilt. The finale opens much closer to true. */
  tiltScale?: number;
};

export function BalanceScale({ capability, mode = 'hero', tiltScale = 1 }: BalanceScaleProps) {
  const beamRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);

  // Shared, mutable, read every frame by both hangers.
  const beam = useMemo<BeamState>(() => ({ tilt: REST_TILT * tiltScale, settled: false }), [tiltScale]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const group = beamRef.current;
    if (!group) return;

    let target: number;

    if (capability.reducedMotion || mode === 'still') {
      // Reduced motion is shown the resolved state of the story: level, at rest.
      target = 0;
    } else if (mode === 'finale') {
      // The finale opens fractionally out and closes to true as it scrolls in,
      // then holds. It does not re-run while the section stays on screen.
      target = REST_TILT * 0.34 * tiltScale * (1 - scrollState.finale);
    } else {
      target = REST_TILT * tiltScale * (1 - scrollState.balance);
    }

    // Damped, frame-rate independent. Slow lambda: the beam is the heaviest
    // thing on screen and must never look eager.
    beam.tilt = damp(beam.tilt, target, 2.6, dt);
    beam.settled = Math.abs(beam.tilt) < 0.0006;
    group.rotation.z = beam.tilt;

    // A barely-perceptible breath on the whole instrument, so a static frame is
    // never completely dead. Disabled under reduced motion.
    if (!capability.reducedMotion && rootRef.current) {
      const t = performance.now() * 0.00013;
      rootRef.current.rotation.y = Math.sin(t) * 0.012;
    }
  });

  return (
    <group ref={rootRef} name="balance">
      {/* --- Plinth ------------------------------------------------------ */}
      <mesh geometry={G.plinthGeometry()} material={M.forgedIron()} castShadow receiveShadow />
      <mesh
        geometry={G.plinthBandGeometry()}
        material={M.engravedGold()}
        position={[0, 0.078, 0]}
      />
      {/* Gold reveal line in the plinth's upper step. */}
      <mesh position={[0, 0.235, 0]}>
        <torusGeometry args={[0.6, 0.0085, 8, 72]} />
        <primitive object={M.antiqueGold()} attach="material" />
      </mesh>

      {/* --- Column ------------------------------------------------------ */}
      <group position={[0, 0.3, 0]}>
        <mesh geometry={G.columnGeometry()} material={M.forgedIron()} castShadow receiveShadow />
        {/* Turned gold collars. Three, at descending sizes — the ornamental
            rhythm lifted from the emblem's frame. */}
        <mesh position={[0, 0.148, 0]}>
          <torusGeometry args={[0.236, 0.0125, 8, 48]} />
          <primitive object={M.antiqueGold()} attach="material" />
        </mesh>
        <mesh position={[0, 1.128, 0]}>
          <torusGeometry args={[0.204, 0.014, 8, 48]} />
          <primitive object={M.polishedGold()} attach="material" />
        </mesh>
        <mesh position={[0, 1.34, 0]}>
          <torusGeometry args={[0.126, 0.0095, 8, 40]} />
          <primitive object={M.antiqueGold()} attach="material" />
        </mesh>
      </group>

      {/*
        --- Instrument face: the graduations the pointer reads against ---
        Mounted PROUD OF THE COLUMN at z = 0.26. That figure is not arbitrary:
        the turned collar at this height swells to a radius of 0.206, so a plate
        any closer intersects the column and the pointer clips straight through
        it. Verified numerically rather than by eye — see the spatial audit
        in the README.
      */}
      <group position={[0, PIVOT_Y, GRADUATION_Z]}>
        <mesh geometry={G.graduationPlateGeometry()} material={M.instrumentPlate()} />
        <mesh
          geometry={G.graduationFaceGeometry()}
          material={M.graduationFace()}
          position={[0, -0.25, 0.028]}
        />
        {/* The bracket that carries the plate off the column, so it reads as
            fitted hardware rather than as floating UI. */}
        <mesh position={[0, -0.336, -0.075]} castShadow>
          <boxGeometry args={[0.052, 0.02, 0.16]} />
          <primitive object={M.gunmetal()} attach="material" />
        </mesh>
      </group>

      {/* --- Fulcrum ----------------------------------------------------- */}
      <mesh
        geometry={G.fulcrumGeometry()}
        material={M.gunmetal()}
        position={[0, PIVOT_Y - 0.07, 0]}
        castShadow
      />

      {/* --- Beam and everything it carries ------------------------------ */}
      <group ref={beamRef} position={[0, PIVOT_Y, 0]}>
        <mesh geometry={G.beamGeometry(BEAM_HALF)} material={M.polishedGold()} castShadow />

        {/* Central boss over the pivot. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.072, 0.019, 10, 32]} />
          <primitive object={M.antiqueGold()} attach="material" />
        </mesh>

        {/* Finial, capping the assembly. */}
        <mesh geometry={G.finialGeometry()} material={M.polishedGold()} position={[0, 0.07, 0]} />

        {/* The boss carrying the pointer forward off the beam. Without it the
            pointer reads as floating in front of the instrument. */}
        <mesh position={[0, -0.005, POINTER_Z / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.021, 0.021, POINTER_Z, 16]} />
          <primitive object={M.antiqueGold()} attach="material" />
        </mesh>

        {/* The pointer itself, forward of the graduation face so it reads clean
            against the arc from the three-quarter camera. */}
        <mesh
          geometry={G.pointerGeometry()}
          material={M.polishedGold()}
          position={[0, -0.01, POINTER_Z]}
          castShadow
        />

        <Hanger side={-1} cargo="bullion" beam={beam} capability={capability} />
        <Hanger side={1} cargo="seal" beam={beam} capability={capability} />
      </group>
    </group>
  );
}
