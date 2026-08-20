import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * 404
 *
 * Written as an out-of-balance state rather than an error page, so even the
 * failure mode stays inside the brand's language.
 */
/**
 * THE 404 WAS IMPERSONATING THE HOMEPAGE.
 *
 * With no metadata of its own it inherited the root layout's, so every
 * not-found response carried the homepage's <title>, its meta description, its
 * og:title and og:url, and a `rel="canonical"` pointing at
 * https://pureweight.gold/ — telling a crawler that a broken URL IS the
 * homepage. Once indexing is enabled it would have inherited `index: true`
 * as well, and any mistyped or stale link shared anywhere becomes a
 * duplicate-content candidate that claims to be the front page.
 *
 * `canonical: null` is the documented way to suppress an inherited canonical
 * in Next's Metadata API rather than to point it somewhere else — a 404 is
 * not a canonical version of anything, including itself.
 */
export const metadata: Metadata = {
  // Bare — the root layout's title template appends the brand name.
  title: "Page not found",
  description:
    "This page does not exist. The shop, what we buy and how a valuation works are all one link away.",
  alternates: { canonical: null },
  // Never indexable, whatever the site-wide indexing switch says.
  robots: { index: false, follow: true },
  openGraph: { title: "Page not found", url: undefined },
};

export default function NotFound() {
  return (
    <section className="mat-stone grain relative flex min-h-[80svh] items-center py-32">
      <div className="shell-narrow text-center">
        <Logo variant="full" className="mx-auto w-32 opacity-50" />

        <Eyebrow className="mt-10 mb-6">Error 404</Eyebrow>

        <h1 className="font-display text-chapter font-normal text-ivory">
          This page could not
          <span className="accent-italic text-gold-high/90"> be found.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-md text-lead text-ash">
          The address may have changed, or it may never have existed. Everything else is where you
          left it.
        </p>

        <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
          <Link href="/" className="btn-primary">
            <span className="relative z-10">Return Home</span>
          </Link>
          <Link href="/contact" className="btn-ghost">
            Visit Our Shop
          </Link>
        </div>
      </div>
    </section>
  );
}
