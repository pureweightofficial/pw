/**
 * Prefixes a public asset path with the deployment's basePath.
 *
 * WHY THIS IS NEEDED: `next/image` applies basePath to its optimiser URL, but
 * with `unoptimized: true` — which every static host requires — it emits the
 * raw `src` untouched. On a project GitHub Pages site served from `/pw`, an
 * unprefixed `/img/x.jpg` resolves against the domain root and 404s.
 *
 * This shipped broken once already with the logo. Every public asset reference
 * goes through here so it cannot happen a third time.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function assetPath(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
