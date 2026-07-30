"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { dustGeometry } from "./geometry";
import { dustSprite } from "./textures";

/**
 * AMBIENT DUST
 *
 * The brief asked for dust "only when it catches the light", and that qualifier
 * is the entire design. A uniform field of glowing motes is the tell of a cheap
 * 3D scene; dust that is invisible except where it crosses a light shaft is what
 * a cinematographer actually gets on set.
 *
 * So each particle's opacity is a gaussian falloff from its distance to the key
 * light's axis, computed in the vertex shader. Most of the field renders as
 * nothing at all, and the handful of motes inside the beam do all the work.
 */

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;

  uniform float uTime;
  uniform float uSize;
  uniform vec3 uShaftOrigin;
  uniform vec3 uShaftDir;
  uniform float uShaftSigma;

  varying float vCatch;

  void main() {
    float phase = aSeed.x;
    float speed = aSeed.y;

    // Three decorrelated slow drifts. Frequencies are deliberately not
    // harmonically related, so the field never visibly cycles.
    vec3 p = position;
    p.x += sin(uTime * 0.071 * speed + phase) * 0.36;
    p.y += cos(uTime * 0.053 * speed + phase * 1.7) * 0.24;
    p.z += sin(uTime * 0.039 * speed + phase * 2.3) * 0.30;

    // Distance from the key light's axis -> how brightly this mote is lit.
    vec3 rel = p - uShaftOrigin;
    vec3 perp = rel - uShaftDir * dot(rel, uShaftDir);
    float d = length(perp);
    vCatch = exp(-(d * d) / (2.0 * uShaftSigma * uShaftSigma));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Perspective-correct point size, with a floor so distant motes do not
    // shimmer into sub-pixel aliasing.
    gl_PointSize = max(1.0, uSize * aSeed.z * (90.0 / max(0.001, -mv.z)));
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uSprite;
  uniform float uOpacity;

  varying float vCatch;

  void main() {
    vec4 tex = texture2D(uSprite, gl_PointCoord);
    float alpha = tex.a * vCatch * uOpacity;

    // Discard the overwhelming majority of the field before it ever blends.
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(tex.rgb, alpha);
  }
`;

export type DustProps = {
  count: number;
  /** Where the key light enters the room. Matches the spotlight in Studio. */
  shaftOrigin?: [number, number, number];
  shaftTarget?: [number, number, number];
  /** Half-width of the visible shaft, in world units. */
  sigma?: number;
  opacity?: number;
  size?: number;
};

export function Dust({
  count,
  shaftOrigin = [-3.4, 5.6, 3.2],
  shaftTarget = [0, 1.4, 0],
  sigma = 1.5,
  opacity = 0.5,
  size = 2.4,
}: DustProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    const origin = new THREE.Vector3(...shaftOrigin);
    const dir = new THREE.Vector3(...shaftTarget).sub(origin).normalize();

    return {
      uTime: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uSprite: { value: dustSprite() },
      uShaftOrigin: { value: origin },
      uShaftDir: { value: dir },
      uShaftSigma: { value: sigma },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (count <= 0) return null;

  return (
    <points geometry={dustGeometry(count)} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        args={[
          {
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}
