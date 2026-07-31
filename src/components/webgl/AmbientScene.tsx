"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { clamp, scrollState } from "@/lib/scroll-store";
import {
  chainLinkGeometry,
  ingotGeometry,
  sealBlockGeometry,
} from "./geometry";
import { bullionGold, chainSteel, metal, sealStone } from "./materials";
import { Dust } from "./Dust";
import { Studio } from "./Studio";

/**
 * AMBIENT SECTION SCENE
 *
 * A quiet 3D backdrop for the sections that had nothing behind them but flat
 * colour. Not a second hero — the opposite. Everything here is deep in the frame,
 * dim, slow, and out of the way of the copy.
 *
 * WHY THIS IS PER-SECTION AND NOT ONE SHARED CANVAS
 *
 * A single fixed full-viewport canvas behind the whole page is the usual answer,
 * and it was the plan until the surfaces were checked: every section paints an
 * OPAQUE `background-color` (mat-steel, mat-stone, mat-glass, mat-walnut,
 * mat-bronze). A canvas behind them would be invisible.
 *
 * Making those surfaces translucent would have meant a lit, moving scene showing
 * through behind every block of text — and `scripts/check-contrast.mjs` audits
 * text against those exact tokens as FLAT surfaces. The whole contrast model
 * would have become unverifiable in one change.
 *
 * So each section owns its scene, inside its own surface, behind its own scrim.
 * The context-count objection that usually kills this approach does not apply,
 * because SceneShell already gates on viewport proximity: canvases mount on
 * approach and unmount when far, so roughly three exist at once rather than one
 * per section.
 *
 * WHY IT IS BUILT ENTIRELY FROM EXISTING PARTS
 *
 * Every geometry, material and light here is already in the scene budget and
 * already reference-counted by SceneShell's disposal. Nothing new is uploaded to
 * the GPU, and the environment cubemap is shared with the assay and closing
 * scenes rather than baked again.
 *
 * RESTRAINT IS THE SPEC, NOT A COMPROMISE
 *
 * The brief asks for restraint and the 3D skill's first anti-pattern is "3D for
 * 3D's sake — random floating shapes". So each variant is an object this business
 * actually handles, drifting almost imperceptibly, at an opacity where it reads as
 * depth rather than as content. Sections whose job is to be read — the placeholder
 * evidence table, the insight index — get nothing at all.
 */

export type AmbientVariant = "motes" | "ingots" | "links" | "seal" | "bar";

export type AmbientSceneProps = {
  capability: Capability;
  variant: AmbientVariant;
  /**
   * Which scroll-store channel drives the parallax. Sections without their own
   * ScrollTrigger fall back to overall page progress.
   */
  channel?: "progress" | "journey" | "assay" | "finale";
};

/** Deterministic pseudo-random, so a scene looks identical on every load. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/* -------------------------------------------------------------------------- */
/* PARALLAX                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Drifts the whole group against the scroll, which is what sells depth. Reads
 * `scrollState` inside useFrame rather than at render time — the store is mutated
 * every scroll frame by MotionProvider, and touching it during render would tie
 * a 60fps signal to React's render loop.
 */
function Parallax({
  channel,
  amount,
  still,
  children,
}: {
  channel: NonNullable<AmbientSceneProps["channel"]>;
  amount: number;
  still: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = ref.current;
    if (!group || still) return;

    // -1..1 across the section, so the drift is centred rather than one-way.
    const t = clamp(scrollState[channel], 0, 1) * 2 - 1;
    group.position.y = -t * amount;
    // A whisper of pointer influence. Capped hard: parallax that tracks the
    // cursor too eagerly reads as a gimmick.
    group.position.x = scrollState.pointerX * amount * 0.16;
  });

  return <group ref={ref}>{children}</group>;
}

/* -------------------------------------------------------------------------- */
/* VARIANTS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Cast bars, deep in the frame and turning slowly.
 *
 * Deliberately unmarked: the geometry carries no stamp, no fineness and no
 * serial. That is the same rule the photography follows, and the reason a stock
 * bullion photograph had to be removed from this site — see public/img/CREDITS.md.
 */
function Ingots({ still }: { still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const geo = ingotGeometry();
  const mat = bullionGold();

  const bars = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        position: [
          -0.9 + hash(i * 3.1) * 1.8,
          -0.4 + hash(i * 5.7) * 0.9,
          -1.6 - hash(i * 7.3) * 1.4,
        ] as [number, number, number],
        rotation: [
          hash(i * 11.2) * 0.6 - 0.3,
          hash(i * 13.7) * Math.PI,
          hash(i * 17.1) * 0.4 - 0.2,
        ] as [number, number, number],
        rate: 0.02 + hash(i * 19.3) * 0.03,
      })),
    [],
  );

  useFrame((_, delta) => {
    if (!ref.current || still) return;
    const step = Math.min(delta, 0.05);
    ref.current.children.forEach((child, i) => {
      child.rotation.y += step * bars[i].rate;
    });
  });

  return (
    <group ref={ref}>
      {bars.map((b, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mat}
          position={b.position}
          rotation={b.rotation}
          scale={1.5}
        />
      ))}
    </group>
  );
}

/**
 * A slow curtain of suspension links — the instrument's chain, abstracted.
 *
 * One InstancedMesh, so the whole curtain is a single draw call regardless of
 * length. The link geometry is the same 6x14 torus the scale itself uses.
 */
function Links({ still, count }: { still: boolean; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = chainLinkGeometry();
  const mat = chainSteel();

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: -2.2 + hash(i * 2.7) * 4.4,
        y: -1.6 + hash(i * 4.1) * 3.2,
        z: -2.4 - hash(i * 6.9) * 1.8,
        scale: 2.6 + hash(i * 8.3) * 3.4,
        phase: hash(i * 9.7) * Math.PI * 2,
        rate: 0.12 + hash(i * 12.1) * 0.22,
      })),
    [count],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = still ? 0 : state.clock.elapsedTime;

    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      dummy.position.set(s.x, s.y + Math.sin(t * 0.18 + s.phase) * 0.12, s.z);
      dummy.rotation.set(Math.PI / 2, t * s.rate + s.phase, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
  );
}

/**
 * A SINGLE GOLD BAR, presented — not scattered atmosphere.
 *
 * The `ingots` variant puts three small bars deep in the frame at scale 1.5,
 * which at journey-section scrim strength reads as an empty black rectangle. This
 * is the opposite brief: one bar, large, near the camera, held in the right-hand
 * column where that section's layout leaves a genuine void.
 *
 * WHY GEOMETRY AND NOT A PHOTOGRAPH
 *
 * Every photographed bar found across four search rounds carries another
 * refiner's stamps — `999.9`, a fineness mark, a serial. That is exactly what got
 * `bullion.jpg` removed from this site: a third party's trademark and a purity
 * claim the client has not verified. `ingotGeometry` is unmarked by construction,
 * so this is a real gold bar making no claim that is not ours to make. The whole
 * argument is in public/img/CREDITS.md.
 *
 * THE MOTION
 *
 * A slow tumble on two axes at incommensurable rates, so the bar never returns to
 * the same pose and the loop is never visible, plus a shallow bob. Scroll drives
 * an additional yaw through the section's own `journey` channel, so the bar turns
 * as the reader advances through the four stages — the section is about a
 * sequence, and the bar advances with it.
 */
function GoldBar({
  still,
  channel,
}: {
  still: boolean;
  channel: NonNullable<AmbientSceneProps["channel"]>;
}) {
  const ref = useRef<THREE.Mesh>(null);

  /**
   * A DEDICATED material, not the shared bullionGold().
   *
   * bullionGold is metalness 1 with envMapIntensity 1.1, tuned for a bar inside
   * the hero's full-strength lighting. A pure metal takes almost nothing from a
   * point light — it renders what the environment reflects — so on the ambient
   * canvas, at exposure 0.86 with a dim shared cubemap, the bar came out a
   * near-black silhouette. Two screenshots confirmed the geometry was present,
   * correctly placed and simply unlit. Dropping metalness lets the key light
   * contribute real diffuse; tripling envMapIntensity recovers the reflection.
   */
  const barMaterial = useMemo(
    () =>
      metal({
        color: new THREE.Color("#e8bd5c"),
        metalness: 0.82,
        roughness: 0.34,
        envMapIntensity: 3.4,
      }),
    [],
  );

  /**
   * PLACED AGAINST THE RUNTIME FRUSTUM, NOT HARDCODED COORDINATES.
   *
   * The first two attempts positioned the bar in absolute world units, reasoning
   * from a 16:10 viewport. Both missed, and the screenshots showed why: this
   * canvas is `absolute inset-0` inside the SECTION, and the journey section is
   * roughly 2000px tall. The render target is therefore strongly PORTRAIT, so the
   * visible world width is about 3 units, not 6.6 — x 1.62 was off-frame to the
   * right, and the bar appeared as a sliver in the corner.
   *
   * `state.viewport` reports the true world width and height at z=0 every frame,
   * so positioning as a FRACTION of it lands in the same visual place regardless
   * of section height, viewport size or aspect. Scale is derived the same way, so
   * the bar keeps its proportion of the frame rather than ballooning on wide
   * screens.
   */
  useFrame((state) => {
    const bar = ref.current;
    if (!bar) return;

    const { width, height } = state.viewport;

    // Right-hand column, upper third — the void the journey layout leaves.
    bar.position.x = width * 0.28;
    bar.scale.setScalar(width * 0.62);

    if (still) {
      // Reduced motion: a fixed three-quarter pose. Present, at rest, and still
      // clearly a bar rather than a silhouette.
      bar.rotation.set(0.42, 0.72, 0.1);
      bar.position.y = height * 0.3;
      return;
    }

    const t = state.clock.elapsedTime;
    // 0.085 and 0.043 share no common factor worth noticing, so the pose never
    // repeats on any timescale a visitor will sit through. Scroll adds yaw
    // through the section's own channel, so the bar turns as the reader advances
    // the four stages — the section is about a sequence, and the bar tracks it.
    bar.rotation.y =
      t * 0.085 + clamp(scrollState[channel], 0, 1) * Math.PI * 0.9;
    bar.rotation.x = 0.34 + Math.sin(t * 0.043) * 0.16;
    bar.rotation.z = Math.sin(t * 0.031) * 0.08;
    bar.position.y = height * 0.3 + Math.sin(t * 0.052) * 0.1;
  });

  return <mesh ref={ref} geometry={ingotGeometry()} material={barMaterial} />;
}

/** The sealed valuation block, turning once every couple of minutes. */
function Seal({ still }: { still: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current || still) return;
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.06;
  });

  return (
    <mesh
      ref={ref}
      geometry={sealBlockGeometry()}
      material={sealStone()}
      position={[0.7, -0.3, -1.7]}
      rotation={[0.22, 0.5, 0.08]}
      scale={3.4}
    />
  );
}

/* -------------------------------------------------------------------------- */

export function AmbientScene({
  capability,
  variant,
  channel = "progress",
}: AmbientSceneProps) {
  // Reduced motion keeps the scene and stops it. Same treatment the instrument,
  // the chains and the ambient CSS glow already get: present, at rest.
  const still = capability.reducedMotion;

  // A third of the hero's dust. These frames are wide and mostly empty, and the
  // hero density would read as fog rather than as a lit shaft.
  const motes = Math.round(capability.particles * 0.34);

  // Instanced, so this is one draw call — but still scaled by tier, because the
  // per-instance matrix write is CPU work on every frame.
  const linkCount =
    capability.tier === "high" ? 26 : capability.tier === "medium" ? 16 : 9;

  return (
    <group position={[0, 0, 0]}>
      <Studio capability={capability} intimate />

      <Parallax channel={channel} amount={0.42} still={still}>
        {variant === "ingots" ? <Ingots still={still} /> : null}
        {variant === "links" ? <Links still={still} count={linkCount} /> : null}
        {variant === "seal" ? <Seal still={still} /> : null}
        {variant === "bar" ? <GoldBar still={still} channel={channel} /> : null}
        {/* 'motes' adds no object at all — the dust IS the scene. */}
      </Parallax>

      <Dust count={motes} opacity={0.3} sigma={1.9} size={2.1} />

      {/* A single warm accent far behind everything, so the objects have an edge
          to catch. Cheaper than a second Studio light and it never reaches the
          copy, which sits in front of the section's own scrim. */}
      <pointLight
        position={[-1.8, 1.4, -2.2]}
        intensity={6}
        distance={6}
        decay={2}
        color="#b87914"
      />

      {/* The bar is PRESENTED rather than buried, so it needs a key of its own.
          The shared accent above sits behind everything and would leave a
          near-silhouette. Placed high and to the right, raking across the top
          face so the cast surface reads as metal rather than as a gold shape. */}
      {variant === "bar" ? (
        <pointLight
          position={[2.6, 2.2, 2.4]}
          intensity={46}
          distance={9}
          decay={2}
          color="#ffe9a8"
        />
      ) : null}
    </group>
  );
}

/** Near-black stand-in while the chunk loads. These scenes are pure atmosphere. */
export function AmbientPoster() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(70% 55% at 30% 40%, rgba(184,121,20,0.07), transparent 70%)",
      }}
    />
  );
}
