"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { damp, scrollState, smoothstep } from "@/lib/scroll-store";
import { CameraRig } from "./CameraRig";
import { metal } from "./materials";
import { signetFaceGeometry, signetRingGeometry } from "./geometry";
import {
  castGoldNormalMap,
  castGoldRoughnessMap,
  hallmarkNormalMap,
} from "./textures";
import { Studio } from "./Studio";

/**
 * ASSAY SCENE — "Value is not guessed. It is measured."
 *
 * A single heavy signet under inspection light. Each valuation factor gets one
 * honest visual idea rather than a UI flourish:
 *
 *   WEIGHT     a caliper ring closes around the piece
 *   PURITY     the struck fineness mark rotates to face the viewer
 *   CONDITION  a raking light crosses the surface, so the hand-polish scratches
 *              and worn edges become visible — exactly what raking light is for
 *              on a real bench
 *   REFERENCE  the piece turns slowly under steady light
 *   FINAL      it comes to rest, fully lit
 *
 * Every label, figure and explanation lives in the HTML beside this canvas.
 * Nothing here carries information a screen reader would miss, and nothing here
 * states or implies a price.
 *
 * NOTE ON PER-FRAME STATE: each sub-component samples `scrollState` inside its
 * own `useFrame` rather than receiving the active factor as a prop. Reading the
 * store during render would capture a stale value, since scroll updates it
 * between renders and deliberately does not trigger one.
 */

/** True while the given factor is the active one. */
function factorLevel(index: number): number {
  return scrollState.assayFactor === index ? 1 : 0;
}

/** The caliper that closes around the piece during the WEIGHT factor. */
function Caliper({ forced }: { forced: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const group = groupRef.current;
    const mat = matRef.current;
    if (!group || !mat) return;

    const visible = forced ? 1 : factorLevel(0);

    // Closes from wide open to just proud of the piece.
    const target = 1.42 - visible * 0.28;
    group.scale.setScalar(damp(group.scale.x, target, 4, dt));

    mat.opacity = damp(mat.opacity, visible * 0.5, 5, dt);
    group.visible = mat.opacity > 0.01;
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[0.78, 0.0035, 6, 128]} />
        <meshBasicMaterial
          ref={matRef}
          color="#f2ce72"
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Graduation ticks around the piece. Instanced and built once — a ring of
 * struck marks is decoration with a job: it makes the object read as something
 * being measured rather than something being displayed.
 */
function MeasurementTicks({ forced }: { forced: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const count = 48;

  const geometry = useMemo(() => new THREE.PlaneGeometry(0.012, 0.05), []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    if (!mesh.userData.built) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2;
        const major = i % 6 === 0;
        dummy.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0);
        dummy.rotation.set(0, 0, a - Math.PI / 2);
        dummy.scale.set(1, major ? 1.9 : 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData.built = true;
    }

    const visible = forced ? 1 : factorLevel(0);
    mat.opacity = damp(mat.opacity, visible * 0.42, 5, dt);
    mesh.visible = mat.opacity > 0.01;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        ref={matRef}
        color="#d7a83d"
        transparent
        opacity={0}
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/** The raking inspection light used during the CONDITION factor. */
function RakingLight({ enabled }: { enabled: boolean }) {
  const lightRef = useRef<THREE.SpotLight>(null);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const light = lightRef.current;
    if (!light) return;

    // A slow lateral pass, nearly parallel to the surface — which is the whole
    // point. Raking light is how you read a surface, not how you light a room.
    const t = (Math.sin(state.clock.elapsedTime * 0.42) + 1) / 2;
    light.position.x = THREE.MathUtils.lerp(-2.1, 2.1, t);

    const target = enabled ? factorLevel(2) * 26 : 0;
    light.intensity = damp(light.intensity, target, 3.5, dt);
    light.visible = light.intensity > 0.05;
  });

  return (
    <spotLight
      ref={lightRef}
      position={[-2.1, 0.14, 1.1]}
      angle={0.72}
      penumbra={0.65}
      decay={2}
      distance={7}
      intensity={0}
      color="#fff0d2"
    />
  );
}

export function AssayScene({ capability }: { capability: Capability }) {
  const ringRef = useRef<THREE.Group>(null);

  /*
    A dedicated material: this piece is worked, worn and handled, so it is
    rougher and less mirror-like than the beam of the balance.

    THE OLD NUMBERS SAID THE OPPOSITE OF THAT SENTENCE. three MULTIPLIES a
    roughness map into the base, and goldRoughnessMap outputs 0.13–0.34, so a
    base of 0.26 gave a TRUE roughness of 0.034–0.088 — the exact range
    materials.ts documents as "a mirror" — on the one object whose whole job is
    to be inspected square-on, inside Studio's hard-edged Lightformer rig. The
    same recipe that produced the mass's flat-plate artefact: during the PURITY
    factor the bezel turns its near-mirror flat to the camera and reflects the
    light panels as hard-edged patches.

    The adversarial audit caught it, not the eye, because on the CURVED band the
    panel reflections stretch into streaks that pass as ordinary metal
    highlights; flat faces are what betray the arithmetic. The bases below are
    set so base × map lands in the worked-metal band this comment always
    intended: ~0.10–0.27 for the ring, ~0.12–0.31 for the face.
  */
  /*
    THE SECOND HALF OF THAT SAME LESSON, found by looking rather than by
    arithmetic. The bases below were corrected once, out of the mirror range
    and into "worked metal" — and the piece still rendered as a banded neon
    torus, because goldRoughnessMap's own range is 0.13-0.34, so even a base
    of 0.8 lands at a true 0.10-0.27. That IS the polished end. On a smooth
    torus filling a square frame, a polished surface has nothing to return
    except the studio's bright panels, stretched into concentric bands with
    no surface detail to interrupt them.

    castGoldRoughnessMap outputs 0.60-1.0, so these bases land where the
    comment always claimed: a true 0.23-0.38, jewellery that has been worn
    rather than jewellery in a vitrine. The normal map does the other half —
    reflections need something to break ON.
  */
  const ringMaterial = useMemo(
    () =>
      metal({
        color: new THREE.Color("#cf9f36"),
        metalness: 1,
        roughness: 0.38,
        roughnessMap: castGoldRoughnessMap(),
        normalMap: castGoldNormalMap(),
        normalScale: new THREE.Vector2(0.55, 0.55),
        envMapIntensity: 1.25,
        anisotropy: 0.3,
      }),
    [],
  );

  const faceMaterial = useMemo(
    () =>
      metal({
        color: new THREE.Color("#cf9f36"),
        metalness: 1,
        roughness: 0.44,
        roughnessMap: castGoldRoughnessMap(),
        // The struck mark stays the face's normal map — it is the whole point
        // of the face — but it is cut deeper now that the surface around it
        // is no longer a mirror competing with it for the eye.
        normalMap: hallmarkNormalMap(),
        normalScale: new THREE.Vector2(1.35, 1.35),
        envMapIntensity: 1.3,
      }),
    [],
  );

  // Materials created here are owned here, so they are disposed here. (The
  // shared library in materials.ts is reference-counted separately by
  // SceneShell; these two are local to this scene and not in that cache.)
  useEffect(
    () => () => {
      ringMaterial.dispose();
      faceMaterial.dispose();
    },
    [ringMaterial, faceMaterial],
  );

  /*
    YAW IS CLAMPED, AND THAT IS A CONTENT REQUIREMENT RATHER THAN A TASTE ONE.

    The caption under this canvas reads: "The piece shown carries a millesimal
    fineness mark of 916." The previous rotation swept the ring through
    Math.PI * 1.15 — 207 degrees — which necessarily passes through 90, where a
    torus is exactly edge-on. At that point the piece rendered as a vertical
    brass sliver about 85px wide inside a 520px frame, with the marked face
    pointing away from the lens entirely.

    So for a good part of this section the page showed an unreadable tube
    beneath a sentence telling the reader to look at a hallmark on it. A design
    review filed it CRITICAL and was right to: on a site whose entire argument
    is that it shows you the evidence, promising a mark the render cannot
    contain is the one kind of mistake this project cannot afford.

    The piece now stays within +/-34 degrees of face-on for the whole range,
    and goes dead square during the PURITY factor, when the copy beside it is
    explicitly about reading fineness. It still moves — a torus held at one
    angle is a photograph — but it moves the way an object being examined in
    the hand moves, which never includes turning its face away.
  */
  const MAX_YAW = 0.6; // ~34 degrees, either side of face-on.

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const ring = ringRef.current;
    if (!ring) return;

    if (capability.reducedMotion) {
      // Presented square-on with the mark readable, and held.
      ring.rotation.set(-0.28, 0, 0);
      return;
    }

    // Square to the lens while PURITY is the live factor; a shallow sway
    // either side of face-on the rest of the time, never past the clamp.
    const sway = Math.sin(scrollState.assay * Math.PI * 2) * MAX_YAW * 0.6;
    const markFacing = scrollState.assayFactor === 1 ? 0 : sway;
    ring.rotation.y = damp(
      ring.rotation.y,
      Math.max(-MAX_YAW, Math.min(MAX_YAW, markFacing)),
      1.9,
      dt,
    );

    // Tips toward the viewer as the section is entered, so the flat bezel and
    // the curved band are both legible at once.
    ring.rotation.x = damp(
      ring.rotation.x,
      -0.34 + smoothstep(scrollState.assay) * 0.16,
      2,
      dt,
    );

    /*
      A slow idle roll, so a paused reader never faces a freeze-frame — but
      BOUNDED. This used to be `ring.rotation.z += dt * 0.035`, an unbounded
      accumulator: leave the section on screen for a minute and the piece has
      rolled 2 radians, past every angle the composition was designed for.
      Reviews describing "stray geometry" and "a broken smear" were looking at
      a ring that had quietly rotated somewhere nobody chose. A sine keeps the
      life and cannot wander.
    */
    ring.rotation.z = Math.sin(state.clock.elapsedTime * 0.22) * 0.06;
  });

  return (
    <group>
      <Studio capability={capability} intimate />
      <CameraRig
        mode="assay"
        capability={capability}
        compact={capability.coarsePointer}
      />

      <group ref={ringRef}>
        <mesh
          geometry={signetRingGeometry()}
          material={ringMaterial}
          castShadow
          receiveShadow
        />
        {/* The bezel carrying the struck fineness mark. */}
        <mesh
          geometry={signetFaceGeometry()}
          material={faceMaterial}
          position={[0, 0.5, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
      </group>

      <Caliper forced={capability.reducedMotion} />
      <MeasurementTicks forced={capability.reducedMotion} />
      <RakingLight enabled={!capability.reducedMotion} />
    </group>
  );
}
