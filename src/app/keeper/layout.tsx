import type { Metadata } from 'next';

/**
 * The keeper sits OUTSIDE the (site) route group on purpose: it inherits the
 * brand's fonts, palette and tokens from the root layout, but none of the
 * marketing chrome — no opening curtain, no nav, no smooth-scroll hijack, no
 * firefly canvas. A tool should open instantly and scroll natively.
 */
export const metadata: Metadata = {
  title: 'Pureweight Keeper',
  // Belt and braces with robots.ts (which disallows /keeper/): an admin
  // login screen has no business in a search index under any circumstances.
  robots: { index: false, follow: false, nocache: true },
  // Suppress the canonical inherited from the root layout, which pointed this
  // page at the homepage — the same defect the 404 carried. Inert here (the
  // page is noindexed and disallowed, so nothing ever consumes it), but a
  // canonical that tells a lie nobody reads is still a lie in the markup.
  alternates: { canonical: null },
};

export default function KeeperLayout({ children }: { children: React.ReactNode }) {
  return children;
}
