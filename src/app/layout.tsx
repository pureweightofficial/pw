import type { Metadata, Viewport } from 'next';
import { Cinzel, Geist_Mono, Manrope, Playfair_Display } from 'next/font/google';
import { Footer } from '@/components/chrome/Footer';
import { Loader } from '@/components/chrome/Loader';
import { Nav } from '@/components/chrome/Nav';
import { SceneCursor } from '@/components/chrome/SceneCursor';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { assetPath } from '@/lib/asset';
import { allowIndexing, brand, buildLocalBusinessJsonLd } from '@/lib/site';
import './globals.css';

/**
 * ROOT LAYOUT
 *
 * TYPE PAIRING — four faces, each with one job.
 *
 *   CINZEL           upright display. Engraved Roman capitals, chosen to sit
 *                    with the logo's heavy Victorian lettering rather than
 *                    against it. Set at 600, because the mark is heavy and a
 *                    lighter weight reads as a different brand beside it.
 *   PLAYFAIR ITALIC  the accent counterpoint. No vintage display face on Google
 *                    Fonts ships an italic, and the design uses italic serif
 *                    accents in 21 places, so the italic stays calligraphic.
 *                    Engraved roman against calligraphic italic is a deliberate
 *                    pairing, not a leftover.
 *   MANROPE          body, navigation, forms. Everything that must simply read.
 *   GEIST MONO       micro-labels only, at 10px with 0.42em tracking.
 *
 * All self-hosted at build time by next/font: no third-party request, and a
 * metric-matched fallback so nothing shifts when they arrive.
 */

/**
 * THE VINTAGE DISPLAY FACE — matched to the logo, not to the reference site.
 *
 * The supplied mark sets PUREWEIGHT in a heavy Victorian display serif: blunt
 * flared serifs, high stroke contrast, engraved-label character. Playfair
 * Display — which the Aurora reference uses, and which this site adopted when
 * matching Aurora was the brief — is a fashion-editorial serif and reads as a
 * different brand entirely beside that mark.
 *
 * Cinzel is drawn from Roman inscriptional capitals, so it reads as *struck into
 * metal* rather than printed. That is the same idea the whole site is built on,
 * and it sits with the logo instead of arguing with it.
 *
 * Note it is a capitals design: lowercase renders as small capitals. That is a
 * deliberate part of the choice, not a limitation — mixed-case headlines become
 * caps-and-small-caps, which is precisely how an assay stamp is lettered.
 *
 * To try a different vintage face, this import and the --font-vintage token are
 * the only two places to change. Rye (Victorian slab, closer serif shape but
 * more saloon-poster) and Yeseva One (heavier, softer, true lowercase) are the
 * two nearest free alternatives.
 */
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-vintage',
  display: 'swap',
  preload: true,
});

/**
 * Retained ONLY for italic accent lines. No vintage display face on Google
 * Fonts ships an italic, and this design uses italic serif accents in 21
 * places — so rather than lose them, the italic counterpoint stays Playfair.
 * An engraved roman against a calligraphic italic is a deliberate pairing, not
 * a leftover.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
  // Explicit, though it is the default — this is the LCP typeface and its
  // preload behaviour is load-bearing.
  preload: true,
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-manrope',
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
    default: 'Pureweight Gold Exchange — Private Gold Valuation & Exchange',
    template: '%s — Pureweight Gold Exchange',
  },
  description:
    'Private gold evaluation and exchange guided by precision, transparency and trusted expertise. Weight, purity and condition examined and explained before any figure is discussed.',
  applicationName: brand.name,
  keywords: [
    'gold valuation',
    'gold exchange',
    'bullion exchange',
    'jewellery evaluation',
    'gold hallmarks',
    'precious metal assessment',
    'private gold appointment',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: brand.name,
    title: 'Pureweight Gold Exchange — Private Gold Valuation & Exchange',
    description:
      'Weight, purity and condition examined and explained before any figure is discussed. Book a private valuation.',
    url: brand.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pureweight Gold Exchange',
    description: 'Private gold evaluation and exchange, guided by precision.',
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
  const jsonLd = buildLocalBusinessJsonLd();

  return (
    <html
      lang="en-GB"
      className={`${cinzel.variable} ${playfair.variable} ${manrope.variable} ${geistMono.variable}`}
      /* CSS url() never receives basePath, so the cracked-gold texture's path is
         injected here through the same helper every other asset uses. */
      style={{ '--craquelure': `url(${assetPath('/brand/craquelure.png')})` } as React.CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOTSTRAP }} />

        {/*
          Structured data is emitted ONLY when the minimum verified business
          details exist. Publishing LocalBusiness markup containing placeholder
          text would put invented information in front of a search engine, which
          is materially worse than publishing none.
        */}
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </head>

      <body className="bg-void text-ivory antialiased">
        <MotionProvider>
          <Loader />
          <SceneCursor />
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}
