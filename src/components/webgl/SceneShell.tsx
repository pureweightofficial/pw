'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import type { Capability } from '@/lib/capability';
import { markHeroReady } from '@/lib/readiness';
import { useCapability, useDocumentVisible, useInViewport } from '@/lib/hooks';
import { disposeGeometry } from './geometry';
import { disposeMaterials } from './materials';
import { setSceneQuality } from './quality';
import { ScalePoster } from './ScalePoster';
import { disposeTextures } from './textures';

/**
 * SCENE SHELL
 *
 * Every WebGL moment on the site is mounted through here, because every one of
 * them needs the same five guarantees:
 *
 *  1. NEVER BLOCK. The poster renders in the first HTML payload. The canvas
 *     mounts after, on top. There is no blank frame and no layout shift, so the
 *     headline and the CTA are readable and clickable from the first paint
 *     regardless of how long the scene takes.
 *  2. NEVER RENDER UNSEEN. Off-screen or backgrounded, the frameloop is `never`
 *     — not throttled, stopped. This is the single largest power saving
 *     available on a page with three scenes.
 *  3. NEVER FAIL LOUDLY. An error boundary plus a `webglcontextlost` listener
 *     both fall back to the poster and a plain-language line. No stack traces,
 *     no broken box.
 *  4. NEVER OVERREACH. Devices that report as weak, data-saving or
 *     software-rendered simply get the poster, permanently. That is a complete
 *     experience, not a degraded one.
 *  5. NEVER LEAK. Shared geometry, materials and textures are reference-counted
 *     across the three scenes and disposed when the last one unmounts.
 */

/* -------------------------------------------------------------------------- */
/* SHARED RESOURCE LIFETIME                                                   */
/* -------------------------------------------------------------------------- */

let mountedScenes = 0;

function retainSharedResources() {
  mountedScenes += 1;
}

function releaseSharedResources() {
  mountedScenes -= 1;
  if (mountedScenes <= 0) {
    mountedScenes = 0;
    disposeGeometry();
    disposeMaterials();
    disposeTextures();
  }
}

/* -------------------------------------------------------------------------- */
/* ERROR BOUNDARY                                                             */
/* -------------------------------------------------------------------------- */

type BoundaryProps = { children: ReactNode; fallback: ReactNode; onError: () => void };

class WebGLBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // Surface for diagnostics, never for the visitor.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[pureweight] WebGL scene failed, showing poster:', error);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* ADAPTIVE QUALITY                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Watches real frame timing and lowers resolution before the visitor can
 * perceive a stutter. Measured performance beats device sniffing — a flagship
 * phone in a warm pocket is a mid-range phone.
 */
function AdaptiveQuality({ cap }: { cap: number }) {
  const setDpr = useThree((s) => s.setDpr);

  return (
    <PerformanceMonitor
      bounds={() => [50, 60]}
      flipflops={3}
      onIncline={() => setDpr(cap)}
      onDecline={() => setDpr(Math.max(1, cap * 0.72))}
      // After three oscillations, stop chasing and hold the low setting.
      onFallback={() => setDpr(1)}
    />
  );
}

/** Applies renderer settings that R3F does not set the way this look needs. */
function RendererSettings({ exposure }: { exposure: number }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, exposure]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* SHELL                                                                      */
/* -------------------------------------------------------------------------- */

export type SceneShellProps = {
  /** Receives the resolved capability so the scene can size itself to it. */
  children: (capability: Capability) => ReactNode;
  /** Rendered under the canvas, and instead of it on fallback. */
  poster?: ReactNode;
  className?: string;
  /** Hero: mount as soon as capability resolves. Others wait for viewport. */
  eager?: boolean;
  camera?: { position: [number, number, number]; fov: number };
  exposure?: number;
  /** Shown beneath the poster when the scene could not be loaded at all. */
  showFallbackNotice?: boolean;
};

export function SceneShell({
  children,
  poster,
  className = '',
  eager = false,
  camera = { position: [0.55, 2.28, 7], fov: 34 },
  exposure = 1.06,
  showFallbackNotice = false,
}: SceneShellProps) {
  const capability = useCapability();
  const [wrapperRef, inViewport] = useInViewport<HTMLDivElement>('300px');
  const documentVisible = useDocumentVisible();

  const [failed, setFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const supported = Boolean(capability?.webgl) && capability?.tier !== 'none' && !failed;
  const shouldMount = supported && (eager || inViewport);
  const active = shouldMount && inViewport && documentVisible;

  const handleError = useCallback(() => setFailed(true), []);

  /**
   * Release the opening sequence when no live scene is coming. Covers a
   * declined GPU, a data-saver signal, and a context that failed outright — in
   * all of those the poster is not a placeholder, it is the finished hero, so
   * there is nothing further to wait for.
   */
  useEffect(() => {
    if (!eager) return;
    if (capability && (!supported || !shouldMount)) markHeroReady();
  }, [eager, capability, supported, shouldMount]);

  useEffect(() => {
    if (!shouldMount || !capability) return;

    // Must be set BEFORE any scene builds its first material or texture — the
    // factories bake the tier into what they construct and into their cache
    // keys, so a later change would be ignored by anything already built.
    setSceneQuality(capability.tier);

    retainSharedResources();
    return releaseSharedResources;
  }, [shouldMount, capability]);

  // A lost context is not an exception — it never reaches the error boundary,
  // so it needs its own listener.
  const handleCreated = useCallback(
    ({ gl }: { gl: THREE.WebGLRenderer }) => {
      const canvas = gl.domElement;
      canvasElRef.current = canvas;

      /**
       * A context loss is only a FAILURE if it happens while the canvas is
       * live. R3F deliberately force-loses the context when a canvas unmounts,
       * to hand the slot back to a browser that only allows a handful — and the
       * non-eager scenes unmount every time they scroll far off-screen. Treating
       * that teardown as a failure set `failed` permanently, so scrolling away
       * from the assay or finale section once meant the live scene never came
       * back: poster forever, on a state flag no visitor could reset.
       *
       * The disambiguator is DOM connection, checked a frame later: after a
       * genuine in-page loss the canvas is still in the document; after an
       * unmount teardown it has been detached by the time the frame fires.
       */
      const onLost = () => {
        requestAnimationFrame(() => {
          if (canvas.isConnected) setFailed(true);
        });
      };

      canvas.addEventListener('webglcontextlost', onLost);
      // Two frames: the first creates the context, the second is the earliest
      // one that has actually been composited. Only then is the scene worth
      // revealing, and only then does the opening sequence get to lift.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSceneReady(true);
          if (eager) markHeroReady();
        }),
      );
    },
    [eager],
  );

  useEffect(
    () => () => {
      canvasElRef.current = null;
    },
    [],
  );

  return (
    <div ref={wrapperRef} className={`relative h-full w-full ${className}`}>
      {/* The poster is always in the DOM. It is the loading state, the fallback
          state, and the layer the live scene fades in over. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: sceneReady && active ? 0 : 1,
          transition: 'opacity 1100ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {poster ?? <ScalePoster />}
      </div>

      {shouldMount && capability ? (
        <WebGLBoundary onError={handleError} fallback={null}>
          <Canvas
            className="absolute inset-0"
            aria-hidden="true"
            tabIndex={-1}
            dpr={[1, capability.dprCap]}
            frameloop={active ? 'always' : 'never'}
            shadows={capability.shadows}
            camera={{ position: camera.position, fov: camera.fov, near: 0.4, far: 40 }}
            gl={{
              antialias: capability.tier === 'high',
              powerPreference: 'high-performance',
              alpha: true,
              stencil: false,
              depth: true,
              // Keeps the canvas readable for a poster capture, at no cost here.
              preserveDrawingBuffer: false,
            }}
            onCreated={handleCreated}
            style={{ opacity: sceneReady ? 1 : 0, transition: 'opacity 1100ms cubic-bezier(0.16,1,0.3,1)' }}
          >
            <RendererSettings exposure={exposure} />
            {capability.tier !== 'low' ? <AdaptiveQuality cap={capability.dprCap} /> : null}
            <Suspense fallback={null}>{children(capability)}</Suspense>
          </Canvas>
        </WebGLBoundary>
      ) : null}

      {failed && showFallbackNotice ? (
        <p
          className="absolute inset-x-0 bottom-6 mx-auto max-w-md px-6 text-center text-[0.7rem] tracking-[0.18em] text-ash uppercase"
          role="status"
        >
          The interactive scene could not be loaded, but you can continue exploring Pureweight.
        </p>
      ) : null}
    </div>
  );
}
