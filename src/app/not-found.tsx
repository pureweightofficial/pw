import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * 404
 *
 * Written as an out-of-balance state rather than an error page, so even the
 * failure mode stays inside the brand's language.
 */
export default function NotFound() {
  return (
    <section className="mat-stone grain relative flex min-h-[80svh] items-center py-32">
      <div className="shell-narrow text-center">
        <Logo variant="full" className="mx-auto w-32 opacity-50" />

        <Eyebrow className="mt-10 mb-6">Error 404</Eyebrow>

        <h1 className="font-display text-chapter font-semibold text-ivory">
          This page could not
          <span className="accent-accent-italic text-gold-high/90"> be found.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-md text-lead text-ash">
          The address may have changed, or it may never have existed. Everything else is where you
          left it.
        </p>

        <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
          <Link href="/" className="btn-primary">
            <span className="relative z-10">Return Home</span>
          </Link>
          <Link href="/request-a-valuation" className="btn-ghost">
            Request a Valuation
          </Link>
        </div>
      </div>
    </section>
  );
}
