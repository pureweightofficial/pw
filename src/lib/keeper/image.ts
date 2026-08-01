/**
 * CLIENT-SIDE IMAGE PREPARATION — the pipeline the static export doesn't have.
 *
 * The Pages build sets `images.unoptimized`, so whatever lands in public/img
 * is byte-for-byte what every visitor downloads, forever (git history keeps
 * every version). One 9MB phone photo uploaded raw would silently undo the
 * site's LCP work and bloat the repo permanently. So the resize happens HERE,
 * before anything is committed: longest edge capped, re-encoded as JPEG at a
 * quality matched to the site's existing photography (all of which sits
 * between 49KB and 184KB at 900x1125).
 */

export type PreparedImage = {
  /** Repo path under public/, e.g. public/img/counter-photo.jpg */
  repoPath: string;
  /** Site-relative path for the content JSON, e.g. /img/counter-photo.jpg */
  contentPath: string;
  bytes: Uint8Array;
  width: number;
  height: number;
};

const MAX_EDGE = 1600;
const QUALITY = 0.82;

function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "photo";
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  // Drawing to a canvas also strips EXIF — location metadata from a phone
  // photo has no business being published on a gold dealer's website.
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image re-encoding failed."))),
      "image/jpeg",
      QUALITY,
    );
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${slugify(file.name)}-${stamp}.jpg`;

  return {
    repoPath: `public/img/${filename}`,
    // REPO-RELATIVE, no /pw: src/lib/asset.ts adds the deployment prefix at
    // render time. Writing /pw here would double the path on a custom domain
    // — the exact 404 class that shipped once via the logo.
    contentPath: `/img/${filename}`,
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width,
    height,
  };
}
