import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Manrope, Playfair_Display } from 'next/font/google';
import { assetPath } from '@/lib/asset';
import { allowIndexing, brand, buildSiteJsonLd, SITE_LOCALE } from '@/lib/site';
import './globals.css';

/**
 * ROOT LAYOUT
 *
 * TYPE PAIRING — three faces, each with one job.
 *
 *   MANROPE          display AND body. Large, tight editorial headlines and
 *                    everything that must simply read — one voice, the way an
 *                    institutional financial platform speaks. Weights to 800
 *                    for display, because a geometric sans at 400 reads as UI,
 *                    not as a headline.
 *   PLAYFAIR ITALIC  the accent counterpoint, demoted to occasional editorial
 *                    lines. A calligraphic italic against a disciplined sans is
 *                    the one flourish the system keeps.
 *   GEIST MONO       micro-labels and MEASUREMENTS: tabular numerals for every
 *                    weight and price, tracked labels at 10px.
 *
 * RYE IS GONE FROM THE PAGE, DELIBERATELY. The Victorian display face carried
 * the previous identity; the overhaul's agreed direction is institutional
 * premium ("Swiss private banking, not jewellery shop"), and a decorative
 * saloon slab is the single loudest element arguing against that. The engraved
 * lettering SURVIVES where it belongs — inside the logo image in the nav and
 * footer, which never rendered in Rye anyway. Dropping the webfont also drops
 * its ~20KB and its display:block paint hold from every page.
 *
 * All self-hosted at build time by next/font: no third-party request, and a
 * metric-matched fallback so nothing shifts when they arrive.
 */

const playfair = Playfair_Display({
  subsets: ['latin'],
  /*
    ITALIC ONLY, TWO WEIGHTS — down from four weights in two styles.

    Playfair reaches the page through exactly one selector. `--font-accent` is
    referenced by `.accent-italic` in globals.css and by nothing else, and that
    rule sets `font-style: italic` unconditionally. The UPRIGHT faces were
    therefore downloaded, and several of them PRELOADED at high priority in the
    head of every page, to render text that does not exist anywhere on this
    site.

    400 and 700 are both kept because the accent is used at two scales: inside
    headings, where it inherits display weight, and in lead paragraphs, where
    it inherits body weight. Dropping to one would make the browser synthesise
    the other, and a faux-bold calligraphic italic is exactly the "looks like a
    mistake" this face was chosen to avoid.

    Eight variants to two. If a design ever needs upright Playfair, add
    `style` back deliberately — do not restore it because it looks incomplete.
  */
  weight: ['400', '700'],
  style: ['italic'],
  variable: '--font-playfair',
  // Same reasoning as Rye: a calligraphic italic has no fallback that resembles
  // it, so a swap reads as a redesign rather than as a font arriving.
  display: 'block',
  // Explicit, though it is the default — this is the LCP typeface and its
  // preload behaviour is load-bearing.
  preload: true,
});

const manrope = Manrope({
  subsets: ['latin'],
  // 700/800 are the display weights — headlines need real weight, and Manrope
  // at 400 is a UI face, not a headline face.
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  /**
   * Stays `swap`, deliberately. This carries the body copy, and invisible body
   * text is worse than a brief substitution — the visitor can start reading
   * immediately. Manrope is also metric-close to the system sans fallback, so
   * the substitution is subtle rather than a change of character.
   */
  display: 'swap',
});

/**
 * The third face, and the one that carries Aurora's signature: micro-labels set
 * in monospace at 9-10px with 0.4em+ tracking. A proportional face cannot do
 * this — at that size and tracking the uneven sidebearings of a humanist sans
 * make the letters drift, whereas a mono's fixed advance keeps the rhythm
 * mechanical, which is exactly the instrument-panel quality wanted here.
 */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  // 500 only — both consumers (.label, .label-ash) hardcode it, and declaring
  // an unused weight doubles the emitted @font-face rules for nothing.
  weight: ['500'],
  variable: '--font-mono-label',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: 'Pureweight Gold Exchange — We Buy Gold, Silver, Coins & Bullion',
    template: '%s — Pureweight Gold Exchange',
  },
  description:
    'We buy gold and silver over the counter — jewellery, coins and bullion. Your items examined and weighed in front of you, with the figure explained before you decide. Live market reference prices.',
  applicationName: brand.name,
  keywords: [
    'sell gold',
    'gold exchange',
    'bullion exchange',
    'sell silver',
    'gold hallmarks',
    'precious metal assessment',
    'private gold appointment',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: brand.name,
    title: 'Pureweight Gold Exchange — We Buy Gold, Silver, Coins & Bullion',
    description:
      'Gold and silver bought over the counter. Weighed in front of you, with the figure explained before you decide.',
    url: brand.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pureweight Gold Exchange',
    description: 'We buy gold and silver, weighed and valued in front of you.',
  },
  // Off until the placeholders are cleared and someone opts in deliberately.
  robots: allowIndexing
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
      }
    : { index: false, follow: false, nocache: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#030303',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Zoom is never disabled. Pinch-zoom is the accessibility feature most often
  // sacrificed for "premium feel", and it is not ours to take away.
  maximumScale: 5,
  /*
    Full-bleed on notched devices. Without this iOS letterboxes the page inside
    the safe area, which on a site built from edge-to-edge black and a fixed
    firefly field means bars down both sides in landscape.

    Only safe because `.shell` / `.shell-narrow` in globals.css now pad with
    max(existing, env(safe-area-inset-*)) — cover without those insets would put
    copy under the notch, which is strictly worse than the letterbox it replaces.
    The two changes are a pair; neither is correct alone.
  */
  viewportFit: 'cover',
};

/**
 * Arms the reveal system before first paint.
 *
 * Runs blocking in <head> so `.will-reveal` elements are hidden before they can
 * flash. The watchdog is the important half: if hydration never completes, the
 * class is removed and every hidden element becomes visible again. Content
 * failing open is non-negotiable.
 */
const REVEAL_BOOTSTRAP = `
(function(){
  try {
    var root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('js-ready');
    setTimeout(function () {
      if (root.dataset.revealsReady !== '1') root.classList.remove('js-ready');
    }, 3000);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildSiteJsonLd();

  return (
    <html
      lang={SITE_LOCALE}
      className={`${playfair.variable} ${manrope.variable} ${geistMono.variable}`}
      /* CSS url() never receives basePath, so the cracked-gold texture's path is
         injected here through the same helper every other asset uses. */
      style={{ '--craquelure': `url(${assetPath('/brand/craquelure.png')})` } as React.CSSProperties}
    >
      <head>
        {/* GitHub Pages cannot send response headers, so the static target gets
            its CSP and referrer policy via meta tags — the only two security
            policies meta can carry (frame-ancestors is ignored in meta form and
            is therefore omitted; clickjacking protection simply does not exist
            on Pages, which is accepted while the preview is noindex). The node
            target sends the full set as real headers from next.config.ts. */}
        {/* connect-src includes api.github.com for the keeper (/keeper), which
            is now a Next route and therefore lives under THIS policy — the old
            vendored panel was its own HTML file and dodged it. The scope of the
            loosening is XHR/fetch to GitHub's API only; scripts, styles and
            frames stay 'self'. */}
        {process.env.GITHUB_PAGES === 'true' ? (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.github.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"
          />
        ) : null}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOTSTRAP }} />

        {/*
          LocalBusiness markup is still emitted ONLY when the minimum verified
          business details exist — publishing it with placeholder text would
          put invented information in front of a search engine, which is worse
          than publishing none.

          But "no LocalBusiness" used to mean NO STRUCTURED DATA AT ALL, and an
          audit of the live site found eleven of thirteen pages in exactly that
          state: silent about which entity they belong to. Organization and
          WebSite say only what this site self-evidently is — its trading name,
          its own URL, its own logo. Nothing there is a credential or a claim
          anyone needs to have checked, and it is precisely what an AI answer
          engine reads to work out who is speaking. See buildSiteJsonLd.
        */}
        {jsonLd.map((node, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
      </head>

      {/*
        The body is now BARE: the marketing chrome — loader, nav, footer,
        cursor, firefly backdrop, Lenis — lives in src/app/(site)/layout.tsx,
        which wraps every public page. The route group exists so /keeper (the
        owner's admin panel) can render in the same brand without inheriting a
        cinematic opening curtain, a marketing nav, or a scroll-hijacking
        smooth-scroller — none of which belong on a tool. not-found and error
        stay at this level and render standalone by design.
      */}
      <body className="bg-void text-ivory antialiased">{children}</body>
    </html>
  );
}
