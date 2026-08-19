"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { damp, scrollState } from "@/lib/scroll-store";

/**
 * CAMERA RIG
 *
 * Two rules, both about restraint:
 *
 *  1. The camera is on rails. It interpolates between authored keyframes driven
 *     by scroll — it never free-orbits. An object this ornamental looks wrong
 *     from most angles, and a visitor who can spin it will find those angles
 *     within seconds.
 *  2. The pointer moves it by less than three degrees. Enough that the scene
 *     feels responsive and has real depth; far short of the parallax swing that
 *     makes a hero feel like a toy.
 *
 * Under reduced motion the rig holds a single fixed frame and ignores both
 * scroll and pointer.
 */

type Keyframe = {
  /** Scroll progress at which this frame is reached, 0..1. */
  at: number;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

/**
 * The hero move: a slow push from a wide three-quarter establishing frame down
 * onto the beam and the loaded pan. It reads as the camera leaning in to look
 * more closely, which is the section's whole subject.
 */
const HERO_PATH: Keyframe[] = [
  /**
   * Retuned against the first real render. The old path targeted y=1.5 — with
   * the scene group offset at -1.15 that is EMPTY AIR above the finial, so the
   * instrument sat low in frame while the beam crossed dead-centre at its
   * widest. Targets now track the instrument's actual mid-height (~0.7 world),
   * and the camera starts wider and more off-axis to reinforce the
   * three-quarter view.
   */
  { at: 0.0, position: [1.35, 1.65, 7.4], target: [0.4, 0.62, 0], fov: 34 },
  { at: 0.45, position: [0.95, 1.5, 6.0], target: [0.35, 0.66, 0], fov: 32 },
  { at: 1.0, position: [0.35, 1.35, 4.7], target: [0.25, 0.72, 0], fov: 30 },
];

/**
 * The finale: a small move toward the pointer as it reaches zero.
 *
 * THE PUSH USED TO BE MUCH LARGER — z 4.6 to 3.35 with fov 30 to 27 — and it
 * was quietly wrecking the composition it was meant to intensify. The frame
 * is 2.52 world units tall at the opening keyframe and only 1.61 at the
 * closing one, so an instrument sized to fit the section at the top of the
 * scroll was 56% oversized by the bottom of it: the pillar and foot left the
 * frame entirely, and the balance met the footer as a severed pan. Three
 * separate review passes described the closing instrument as "amputated",
 * "guillotined mid-instrument", "the base is never shown", and this path is
 * the reason a fix applied to the scene's own scale could not hold.
 *
 * The move is now small enough to feel and too small to re-crop: about 3% of
 * distance and one degree of field. The intimacy at the end of this section
 * comes from the light and from the instrument coming to rest, not from
 * shoving the lens into it.
 */
const FINALE_PATH: Keyframe[] = [
  { at: 0.0, position: [0.42, 2.02, 4.6], target: [0, 1.63, 0], fov: 30 },
  { at: 1.0, position: [0.18, 1.98, 4.46], target: [0, 1.63, 0], fov: 29 },
];

/** The assay subject sits alone; the camera barely moves at all. */
const ASSAY_PATH: Keyframe[] = [
  { at: 0.0, position: [0, 0.14, 3.1], target: [0, 0, 0], fov: 30 },
  { at: 1.0, position: [0.16, -0.06, 2.5], target: [0, 0, 0], fov: 28 },
];

const PATHS = {
  hero: HERO_PATH,
  finale: FINALE_PATH,
  assay: ASSAY_PATH,
} as const;

export type RigMode = keyof typeof PATHS;

function sample(
  path: Keyframe[],
  t: number,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
) {
  const clamped = Math.max(0, Math.min(1, t));

  let a = path[0];
  let b = path[path.length - 1];

  for (let i = 0; i < path.length - 1; i += 1) {
    if (clamped >= path[i].at && clamped <= path[i + 1].at) {
      a = path[i];
      b = path[i + 1];
      break;
    }
  }

  const span = b.at - a.at;
  const local = span <= 0 ? 0 : (clamped - a.at) / span;
  // Smoothstep between keyframes so the move has no visible corners.
  const e = local * local * (3 - 2 * local);

  outPos.set(
    THREE.MathUtils.lerp(a.position[0], b.position[0], e),
    THREE.MathUtils.lerp(a.position[1], b.position[1], e),
    THREE.MathUtils.lerp(a.position[2], b.position[2], e),
  );
  outTarget.set(
    THREE.MathUtils.lerp(a.target[0], b.target[0], e),
    THREE.MathUtils.lerp(a.target[1], b.target[1], e),
    THREE.MathUtils.lerp(a.target[2], b.target[2], e),
  );

  return THREE.MathUtils.lerp(a.fov, b.fov, e);
}

export type CameraRigProps = {
  mode: RigMode;
  capability: Capability;
  /**
   * Pulls the subject off-centre and closer on narrow viewports, so the
   * headline never lands on the busiest part of the instrument.
   */
  compact?: boolean;
};

export function CameraRig({
  mode,
  capability,
  compact = false,
}: CameraRigProps) {
  const { camera } = useThree();

  const desired = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3(0, 1.5, 0));

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const path = PATHS[mode];

    const progress =
      mode === "hero"
        ? scrollState.hero
        : mode === "finale"
          ? scrollState.finale
          : scrollState.assay;

    const fov = sample(
      path,
      capability.reducedMotion ? 0 : progress,
      desired.current,
      target.current,
    );

    if (compact) {
      // Mobile: closer crop, subject pushed down and slightly right so the
      // headline block above it sits over empty room rather than over ornament.
      desired.current.multiplyScalar(0.82);
      desired.current.y += 0.12;
      target.current.y += 0.2;
    }

    if (!capability.reducedMotion) {
      // Parallax, hard-capped. At the hero's ~6m distance this is under 3°.
      desired.current.x += scrollState.pointerX * 0.3;
      desired.current.y += scrollState.pointerY * 0.17;
    }

    // Slow damping: the camera has mass too.
    const lambda = capability.reducedMotion ? 100 : 2.2;
    camera.position.x = damp(camera.position.x, desired.current.x, lambda, dt);
    camera.position.y = damp(camera.position.y, desired.current.y, lambda, dt);
    camera.position.z = damp(camera.position.z, desired.current.z, lambda, dt);

    smoothTarget.current.x = damp(
      smoothTarget.current.x,
      target.current.x,
      lambda,
      dt,
    );
    smoothTarget.current.y = damp(
      smoothTarget.current.y,
      target.current.y,
      lambda,
      dt,
    );
    smoothTarget.current.z = damp(
      smoothTarget.current.z,
      target.current.z,
      lambda,
      dt,
    );

    camera.lookAt(smoothTarget.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = damp(camera.fov, compact ? fov + 8 : fov, lambda, dt);
      if (Math.abs(nextFov - camera.fov) > 0.002) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
