"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { clamp, scrollState } from "@/lib/scroll-store";
import { dustSprite } from "./textures";

/**
 * THE FIREFLY FIELD
 *
 * One field of drifting gold motes behind the ENTIRE site, not a per-section
 * effect. It is mounted once, fixed to the viewport, and every section's
 * surface is translucent enough to let it through — see `--surface-alpha` in
 * globals.css, which is the other half of this.
 *
 * WHY ONE FIXED FIELD RATHER THAN A SCENE PER SECTION
 *
 * A per-section field restarts at every boundary: motes visibly pop in and out
 * as sections mount, and the parallax resets, which reads as a stack of
 * separate pages. A single fixed field is continuous — scroll the whole site
 * and the same motes travel with you. It is also cheaper: this one canvas
 * replaces the three `motes` ambient scenes it made redundant.
 *
 * WHAT SEPARATES A FIREFLY FROM A DUST MOTE
 *
 * `Dust` is deliberately invisible except where it crosses a light shaft — the
 * cinematographer's trick, and correct for a lit interior. A firefly is the
 * opposite: it carries its OWN light, so it must read against pure black with
 * no shaft to justify it. Three things sell it and all three are per-particle:
 *
 *   drift    slow, on three non-harmonic frequencies, so the field never
 *            visibly loops however long anyone watches
 *   twinkle  a slow brightness pulse at its own rate and phase, never fully
 *            extinguishing — synchronised blinking looks mechanical
 *   depth    size, speed, brightness and parallax all scale together, so the
 *            field has real front-to-back separation rather than being a
 *            flat sheet of dots
 *
 * SCROLL
 *
 * Motes rise as the page scrolls down, at a rate set by their depth: near ones
 * travel much further than far ones. The field is a fixed height in world
 * units and positions WRAP, so scrolling never empties it and there is no
 * seam — a mote leaving the top re-enters at the bottom with the same seed.
 *
 * RESTRAINT, BECAUSE THIS SITS BEHIND EVERY WORD ON THE SITE
 *
 * Every parameter here is bounded by one requirement: body copy must clear
 * 4.5:1 against whatever this renders, everywhere, at every scroll position.
 * That is enforced by scripts/check-section-scene-contrast.mjs against the
 * real composite, not estimated. The motes are small, sparse, additive over
 * black, and the brightest is dimmer than the site's own gold type.
 */

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;   // x: phase, y: speed, z: size, w: depth (0 far..1 near)

  uniform float uTime;
  uniform float uScroll;
  uniform float uSize;
  uniform float uHeight;

  varying float vGlow;
  varying float vDepth;

  void main() {
    float phase = aSeed.x;
    float speed = aSeed.y;
    float depth = aSeed.w;

    vec3 p = position;

    // Drift. Frequencies share no useful common factor, so the pattern never
    // returns to a pose a visitor would recognise.
    p.x += sin(uTime * 0.083 * speed + phase) * 0.42;
    p.y += cos(uTime * 0.061 * speed + phase * 1.7) * 0.30;
    p.z += sin(uTime * 0.047 * speed + phase * 2.3) * 0.22;

    // Scroll parallax, scaled by depth so the field has real separation.
    p.y += uScroll * mix(1.2, 5.4, depth);

    // WRAP. Without this the field drains out of frame on a long page. mod()
    // keeps every mote inside a band of uHeight, so the supply is endless and
    // the seam is invisible — a mote exits the top and re-enters the bottom
    // with its own seed intact.
    p.y = mod(p.y + uHeight * 0.5, uHeight) - uHeight * 0.5;

    // Twinkle: its own rate and phase per mote, floored so none blinks out.
    float pulse = 0.55 + 0.45 * sin(uTime * (0.34 + speed * 0.5) + phase * 3.1);
    vGlow = pulse;
    vDepth = depth;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Perspective-correct, with a floor: sub-pixel points shimmer as they
    // cross the pixel grid, which reads as noise rather than as light.
    gl_PointSize = max(1.5, uSize * aSeed.z * (90.0 / max(0.001, -mv.z)));
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uSprite;
  uniform float uOpacity;
  uniform vec3 uWarm;
  uniform vec3 uPale;

  varying float vGlow;
  varying float vDepth;

  void main() {
    vec4 tex = texture2D(uSprite, gl_PointCoord);

    // Near motes run paler and hotter, far ones stay deep amber. Real depth
    // cue, and it stops the field reading as one flat colour.
    vec3 tint = mix(uWarm, uPale, vDepth * vGlow);

    float alpha = tex.a * vGlow * mix(0.45, 1.0, vDepth) * uOpacity;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(tint, alpha);
  }
`;

/** World-space height of the wrap band. Generous, so wrapping is never seen. */
const FIELD_HEIGHT = 26;

function fieldGeometry(count: number, width: number) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);

  // Deterministic: the same field every load, so a screenshot-driven contrast
  // gate measures the same thing twice. Math.random would make it unfalsifiable.
  let s = 20240917;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };

  for (let i = 0; i < count; i++) {
    const depth = rnd();
    positions[i * 3 + 0] = (rnd() - 0.5) * width;
    positions[i * 3 + 1] = (rnd() - 0.5) * FIELD_HEIGHT;
    // Near motes sit closer to the camera; depth drives everything together.
    positions[i * 3 + 2] = -7.5 + depth * 6.5;

    seeds[i * 4 + 0] = rnd() * Math.PI * 2;
    seeds[i * 4 + 1] = 0.5 + rnd() * 1.1;
    seeds[i * 4 + 2] = 0.55 + rnd() * 0.85;
    seeds[i * 4 + 3] = depth;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
  return geo;
}

export function FireflyField({ capability }: { capability: Capability }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const still = capability.reducedMotion;

  /*
    Density by tier. These are POINTS in one draw call, so the cost is
    per-fragment rather than per-object — but a phone's fill rate is the
    scarce thing, and additive blending pays for every overlapping sprite.
  */
  const count =
    capability.tier === "high" ? 190 : capability.tier === "medium" ? 110 : 55;

  const geometry = useMemo(() => fieldGeometry(count, 30), [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSize: { value: 2.7 },
      uHeight: { value: FIELD_HEIGHT },
      uOpacity: { value: 0.88 },
      uSprite: { value: dustSprite() },
      uWarm: { value: new THREE.Color("#b87914") },
      uPale: { value: new THREE.Color("#f2ce72") },
    }),
    [],
  );

  useFrame((state) => {
    const m = materialRef.current;
    if (!m) return;

    /*
      Reduced motion freezes time and scroll response, leaving the field
      present and at rest. WCAG 2.2 SC 2.2.2 is about motion the visitor did
      not ask for, and this is the largest moving thing on the site — but a
      still field is still a field, so nothing is lost but the movement.
    */
    if (still) {
      m.uniforms.uTime.value = 0;
      m.uniforms.uScroll.value = 0;
      return;
    }

    m.uniforms.uTime.value = state.clock.elapsedTime;

    // Lerped, not assigned. Reading scroll straight into the uniform makes the
    // field jump on a fast flick or an anchor jump; easing it keeps the motes
    // moving like objects with mass, which is the whole point of the effect.
    const target = clamp(scrollState.progress, 0, 1) * FIELD_HEIGHT * 0.62;
    m.uniforms.uScroll.value +=
      (target - m.uniforms.uScroll.value) * 0.06;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}
