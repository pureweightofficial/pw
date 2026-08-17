/**
 * WHO IS STILL USING THE SHARED GPU RESOURCES?
 *
 * geometry.ts, materials.ts and textures.ts each memoise their output in a
 * module-level cache, so a lathe profile or a roughness map is built once and
 * shared by every scene that wants it. That is the right design — it is why
 * this project ships no binary 3D assets and still only pays for each surface
 * once — but it means no single component owns the lifetime of anything, and
 * the last consumer to leave has to turn the lights off.
 *
 * This counter is that responsibility, and it lives here rather than inside
 * SceneShell because SceneShell stopped being the only consumer.
 *
 * THE BUG THIS EXISTS TO PREVENT, which was live and did real damage.
 *
 * The counter used to be a private variable in SceneShell.tsx. The persistent
 * world (webgl/world/*) then began drawing from the same three caches —
 * goldMassGeometry, massGold, instrumentPlate, studioEnvMap — without ever
 * incrementing it, because it does not mount through SceneShell.
 *
 * On the homepage that produced this sequence:
 *
 *   1. the world mounts and renders                      count 0
 *   2. the visitor scrolls to the assay section          count 1
 *   3. the visitor scrolls past it and it unmounts       count 0
 *   4. -> disposeGeometry(), disposeMaterials(), disposeTextures()
 *
 * Step 4 disposed the geometry, material and environment texture that the world
 * was still drawing with, on a canvas that was still running. The mass went
 * black or vanished outright, several chapters in, with nothing in the console
 * and no failing gate — a reviewer described the object as simply absent from
 * the later frames and no one could account for it.
 *
 * A shared cache with a private refcount is a cache with a wrong refcount as
 * soon as it gains a second consumer. Anything that reads from those three
 * modules must retain here for as long as it holds what it read.
 */

import { disposeGeometry } from "./geometry";
import { disposeMaterials } from "./materials";
import { disposeTextures } from "./textures";

let consumers = 0;

/** Call on mount, before touching any memoised geometry, material or texture. */
export function retainSharedResources(): void {
  consumers += 1;
}

/**
 * Call on unmount. The last one out disposes everything.
 *
 * Clamped at zero rather than trusted: an unbalanced release would otherwise
 * drive the count negative and permanently defeat the guard, which is a far
 * worse failure than leaking one cache — it would dispose live resources on
 * every subsequent unmount.
 */
export function releaseSharedResources(): void {
  consumers -= 1;
  if (consumers <= 0) {
    consumers = 0;
    disposeGeometry();
    disposeMaterials();
    disposeTextures();
  }
}

/** Exposed for assertions and debugging only; never branch rendering on this. */
export function sharedResourceConsumers(): number {
  return consumers;
}
