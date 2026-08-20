/**
 * SHOULD THIS DEVICE LOAD THE 3D AT ALL?
 *
 * Answered here, deliberately outside every module that touches three.js, so
 * that answering it costs nothing. The scenes themselves already decline to
 * RENDER on weak hardware — this decides whether the renderer is even fetched.
 *
 * The two are not the same thing, and the gap has been measurable TWICE. A
 * phone reporting 2g with Data Saver on drew no canvas and still downloaded
 * 167KB (gzipped) of WebGL to reach that conclusion. Later, a four-core phone
 * did the same for 919KB, because a new "stand down on low tier" rule was
 * written inside the canvas component instead of here. Same bug, same cause:
 * a capability check on the far side of the code-split boundary.
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
      "none" OR "low" — and the second half of that was missing for a while,
      at a cost of 919KB to exactly the devices least able to pay it.

      What happened: the persistent world was made to stand down on low-tier
      hardware, and the check was written inside WorldCanvas — which is on the
      FAR side of the next/dynamic boundary. So a four-core phone resolved this
      gate to "canvas", fetched the whole three.js chunk, and only then reached
      a component that returned null. Measured on an emulated 4-core / 4GB
      handset: zero canvases rendered, 919KB of renderer downloaded.

      That is the exact failure this module's header describes, reintroduced by
      putting a second capability rule in a second place. Hence one rule, here,
      before the import: the gate now excludes every tier that will not draw.

      If a tier is ever added that renders something cheaper rather than
      nothing, this is the line that must learn about it — not a check inside a
      component the browser has already paid to download.
    */
    setGate(cap.tier === "none" || cap.tier === "low" ? "poster" : "canvas");
  }, []);

  return gate;
}
