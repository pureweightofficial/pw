"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { progressThrough } from "@/lib/chapters";
import { damp, scrollState } from "@/lib/scroll-store";

/**
 * A CHOREOGRAPHED CAMERA, NOT AN ORBIT CONTROL.
 *
 * The difference the brief is pointing at is authorship. Orbit controls put the
 * visitor in a viewer; a shot list puts them in a film. So this camera has
 * marks — a defined position for each chapter — and it moves between them the
 * way a camera on a dolly moves: it starts slowly, it never changes direction
 * abruptly, and it never circles the subject.
 *
 * THE MARKS, and what each is for:
 *
 *   hero      high and wide, looking slightly down. Establishes the object as
 *             an object in a space, and leaves the upper-left of frame empty
 *             for the headline.
 *   weight    lowers toward eye level as the mass settles. Dropping the camera
 *             while the object descends makes the descent feel longer and
 *             heavier than moving either alone would.
 *   purity    close, nearly level with the machined flat. This is the only
 *             chapter where the camera is near the surface, which is what makes
 *             the inspection read as inspection.
 *   market    pulls back and holds. The chapter is about numbers, not metal,
 *             so the camera gets out of the way.
 *   value     a slow push, very slight. Convergence, felt rather than seen.
 *   trust     back and static. The UI is the subject here.
 *   close     centred and completely still. Confidence is stillness.
 *
 * Every value below is a position in metres and a look-at target. There are no
 * easing curves: interpolation between marks is exponential damping, so the
 * camera has inertia and cannot snap even if the visitor flings the scrollbar.
 */

type Mark = {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

const MARKS: Record<string, Mark> = {
  hero: { pos: [1.15, 1.72, 5.6], look: [0.15, 0.1, 0], fov: 32 },
  weight: { pos: [0.85, 0.72, 4.6], look: [0.05, -0.15, 0], fov: 32 },
  purity: { pos: [0.28, -0.06, 2.85], look: [0, -0.16, 0], fov: 28 },
  market: { pos: [1.05, 0.5, 5.9], look: [0.1, -0.2, 0], fov: 34 },
  value: { pos: [0.8, 0.34, 5.15], look: [0.05, -0.2, 0], fov: 33 },
  trust: { pos: [1.3, 0.66, 6.4], look: [0.15, -0.18, 0], fov: 35 },
  close: { pos: [0, 0.28, 4.9], look: [0, -0.2, 0], fov: 31 },
};

const ORDER = ["hero", "weight", "purity", "market", "value", "trust", "close"] as const;

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number) =>
  [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  ] as [number, number, number];

export function WorldCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const current = useRef({
    x: MARKS.hero.pos[0], y: MARKS.hero.pos[1], z: MARKS.hero.pos[2],
    lx: MARKS.hero.look[0], ly: MARKS.hero.look[1], lz: MARKS.hero.look[2],
    fov: MARKS.hero.fov,
    px: 0, py: 0,
  });

  useFrame((_, delta) => {
    const p = scrollState.progress;

    /*
      Find the two marks this progress sits between and blend. Reading the
      chapter list rather than hard-coding thresholds means moving a boundary in
      lib/chapters moves the camera with it — the brief's warning about
      hard-coding animation to individual DOM sections applies just as much to
      hard-coding it to numbers scattered across files.
    */
    let from = MARKS[ORDER[0]];
    let to = MARKS[ORDER[0]];
    let t = 0;
    for (let i = 0; i < ORDER.length; i++) {
      const done = progressThrough(ORDER[i], p);
      if (done > 0 && done < 1) {
        from = MARKS[ORDER[i]];
        to = MARKS[ORDER[Math.min(i + 1, ORDER.length - 1)]];
        t = done;
        break;
      }
      if (done >= 1) {
        from = MARKS[ORDER[Math.min(i + 1, ORDER.length - 1)]];
        to = from;
        t = 0;
      }
    }

    const pos = lerp3(from.pos, to.pos, t);
    const look = lerp3(from.look, to.look, t);
    const fov = THREE.MathUtils.lerp(from.fov, to.fov, t);

    /*
      REDUCED MOTION. The camera stops travelling entirely and sits at the mark
      for wherever the visitor is; the composition still changes as they scroll,
      but nothing glides. The scene keeps its lighting and its material, so the
      page is still the premium page — it just stops moving, which is what the
      preference actually asks for.
    */
    const lambda = reducedMotion ? 999 : 1.25;

    current.current.x = damp(current.current.x, pos[0], lambda, delta);
    current.current.y = damp(current.current.y, pos[1], lambda, delta);
    current.current.z = damp(current.current.z, pos[2], lambda, delta);
    current.current.lx = damp(current.current.lx, look[0], lambda, delta);
    current.current.ly = damp(current.current.ly, look[1], lambda, delta);
    current.current.lz = damp(current.current.lz, look[2], lambda, delta);
    current.current.fov = damp(current.current.fov, fov, lambda, delta);

    // Pointer parallax, on the CAMERA rather than the object. Moving the
    // viewpoint produces real parallax against the background planes; rotating
    // the object produces the "toy on a turntable" feeling the brief rules out.
    if (!reducedMotion) {
      current.current.px = damp(current.current.px, scrollState.pointerX, 1.6, delta);
      current.current.py = damp(current.current.py, scrollState.pointerY, 1.6, delta);
    }

    camera.position.set(
      current.current.x + current.current.px * 0.13,
      current.current.y + current.current.py * 0.08,
      current.current.z,
    );
    camera.lookAt(current.current.lx, current.current.ly, current.current.lz);

    if (Math.abs(camera.fov - current.current.fov) > 0.01) {
      camera.fov = current.current.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
