/**
 * CAPABILITY DETECTION
 *
 * Decides how much experience this device should be asked to render. The rule
 * is that the *content* never varies — only the fidelity of the atmosphere. A
 * visitor on a five-year-old phone with WebGL disabled and reduced motion on
 * still reads every word, uses every control and submits the form.
 */

export type QualityTier = 'high' | 'medium' | 'low' | 'none';

export type Capability = {
  tier: QualityTier;
  webgl: boolean;
  reducedMotion: boolean;
  coarsePointer: boolean;
  saveData: boolean;
  /**
   * A metered or genuinely slow connection, reported by the Network Information
   * API. Separate from `saveData` and from `tier` on purpose: the hero video is
   * gated on bandwidth, not on GPU, so a device with no WebGL at all still gets
   * the full moving hero as long as its connection can carry half a megabyte.
   */
  slowNetwork: boolean;
  /** Device pixel ratio ceiling for the renderer. */
  dprCap: number;
  /** Whether to render real-time shadows. */
  shadows: boolean;
  /** Ambient dust particle count. */
  particles: number;
  /** Whether chain links get per-frame pendulum simulation. */
  chainPhysics: boolean;
};

const SSR_DEFAULT: Capability = {
  tier: 'none',
  webgl: false,
  reducedMotion: false,
  coarsePointer: false,
  saveData: false,
  slowNetwork: false,
  dprCap: 1,
  shadows: false,
  particles: 0,
  chainPhysics: false,
};

let cached: Capability | null = null;

/**
 * Probes for a real WebGL2/WebGL context. We create and immediately dispose a
 * throwaway canvas — some browsers report the extension as present but fail on
 * actual context creation (blocklisted drivers, headless, GPU process crash),
 * and only creation tells the truth.
 */
function probeWebGL(): { ok: boolean; renderer: string } {
  if (typeof window === 'undefined') return { ok: false, renderer: '' };

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;

    if (!gl) return { ok: false, renderer: '' };

    let renderer = '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '');
    }

    // Release the probe context immediately so we do not burn one of the
    // browser's limited simultaneous WebGL contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    return { ok: true, renderer };
  } catch {
    return { ok: false, renderer: '' };
  }
}

export function detectCapability(): Capability {
  if (typeof window === 'undefined') return SSR_DEFAULT;
  if (cached) return cached;

  const { ok: webgl, renderer } = probeWebGL();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  const saveData = Boolean(connection?.saveData);
  const slowNetwork = /^(slow-2g|2g|3g)$/.test(connection?.effectiveType ?? '');

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 768;

  // Software rasterisers report themselves; they will not sustain a real scene.
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);

  let tier: QualityTier;
  if (!webgl || software) {
    tier = 'none';
  } else if (saveData || slowNetwork) {
    // Respect an explicit data-saving signal by not downloading/compiling the
    // full scene, even if the hardware could handle it.
    tier = 'none';
  } else if (cores <= 4 || memory <= 4 || (coarsePointer && smallViewport)) {
    tier = 'low';
  } else if (cores <= 8 || smallViewport) {
    tier = 'medium';
  } else {
    tier = 'high';
  }

  const byTier: Record<
    QualityTier,
    Omit<
      Capability,
      'tier' | 'webgl' | 'reducedMotion' | 'coarsePointer' | 'saveData' | 'slowNetwork'
    >
  > = {
    high: { dprCap: 1.75, shadows: true, particles: 140, chainPhysics: true },
    medium: { dprCap: 1.5, shadows: true, particles: 60, chainPhysics: true },
    low: { dprCap: 1, shadows: false, particles: 0, chainPhysics: false },
    none: { dprCap: 1, shadows: false, particles: 0, chainPhysics: false },
  };

  const base = byTier[tier];

  cached = {
    tier,
    webgl,
    reducedMotion,
    coarsePointer,
    saveData,
    slowNetwork,
    ...base,
    // Reduced motion keeps the scene but stills it: no drifting particles, no
    // swinging chains. The object is presented already at rest.
    particles: reducedMotion ? 0 : base.particles,
    chainPhysics: reducedMotion ? false : base.chainPhysics,
  };

  return cached;
}

/** Test seam — lets the quality demo route force a tier. */
export function overrideCapability(next: Partial<Capability>): void {
  cached = { ...(cached ?? detectCapability()), ...next };
}
