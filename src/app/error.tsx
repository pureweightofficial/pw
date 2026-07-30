'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Eyebrow } from '@/components/ui/primitives';

/**
 * ERROR BOUNDARY
 *
 * Visitors get plain language and two working exits. The stack trace goes to
 * the console in development and to whatever monitoring is wired up in
 * production — never onto the page. A visitor who came to ask about their
 * grandmother's rings should not be shown a component stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[pureweight] unhandled error', error);
  }, [error]);

  return (
    <section className="mat-stone grain relative flex min-h-[80svh] items-center py-32">
      <div className="shell-narrow text-center">
        <Eyebrow className="mb-6">Something went wrong</Eyebrow>

        <h1 className="font-display text-chapter font-normal text-ivory">
          We could not load
          <span className="accent-italic text-gold-high/90"> this page.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-md text-lead text-ash">
          This is a fault at our end, not yours. Try again, and if it persists please contact us
          directly and we will help.
        </p>

        {error.digest ? (
          <p className="mt-6 text-xs tracking-[0.16em] text-ash uppercase">
            Reference {error.digest}
          </p>
        ) : null}

        <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-7">
          <button type="button" onClick={reset} className="btn-primary">
            <span className="relative z-10">Try Again</span>
          </button>
          <Link href="/contact" className="btn-ghost">
            Contact Pureweight
          </Link>
        </div>
      </div>
    </section>
  );
}
