/**
 * SHOULD THIS DEVICE LOAD THE 3D AT ALL?
 *
 * Answered here, deliberately outside every module that touches three.js, so
 * that answering it costs nothing. The scenes themselves already decline to
 * RENDER on weak hardware — this decides whether the renderer is even fetched.
 *
 * The two are not the same thing, and the gap was measurable: a phone
 * reporting 2g with Data Saver switched on drew no canvas and still downloaded
 * 167KB (gzipped) of WebGL to reach that conclusion, because the capability
 * check lived on the far side of the code-split boundary.
 *
 * `null` means "not known yet" — capability is probed in an effect, so the
 * first render always predates it. Callers must treat null as "poster", which
 * is correct anyway: the poster is the first paint for everybody.
 */

import { useEffect, useState } from "react";
import { detectCapability } from "./capability";

export type SceneGate = "poster" | "canvas" | null;

export function useSceneGate(): SceneGate {
  const [gate, setGate] = useState<SceneGate>(null);

  useEffect(() => {
    const cap = detectCapability();
    /*
      Tier "none" is exactly the set capability.ts already defines as "do not
      pay for this": no usable WebGL context, or an explicit data-saving or
      slow-connection signal. Reusing it rather than inventing a second rule
      keeps one definition of a weak device in the codebase.
    */
    setGate(cap.tier === "none" ? "poster" : "canvas");
  }, []);

  return gate;
}
