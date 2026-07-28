import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Manrope, Playfair_Display } from 'next/font/google';
import { Footer } from '@/components/chrome/Footer';
import { Loader } from '@/components/chrome/Loader';
import { Nav } from '@/components/chrome/Nav';
import { SceneCursor } from '@/components/chrome/SceneCursor';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { allowIndexing, brand, buildLocalBusinessJsonLd } from '@/lib/site';
import './globals.css';

/**
 * ROOT LAYOUT
 *
 * Type pairing: Playfair Display for display, Manrope for everything
 * functional — matching the Aurora reference, which pairs exactly these two.
 *
 * ONE CONSEQUENCE WORTH KNOWING: Playfair is a high-contrast transitional and
 * ships no 300 weight. Its thin strokes are the first thing to vanish on a
 * near-black ground, so display type sits at 400 rather than the 300 the layout
 * was originally tuned around. Headlines read heavier and more theatrical than
 * before — that is the Aurora character, not a regression.
 *
 * Both are self-hosted at build time by next/font: no render-blocking request
 * to a third party, and a metric-matched fallback so nothing shifts on arrival.
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
  weight: ['400', '500'],
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
    <html lang="en-GB" className={`${playfair.variable} ${manrope.variable} ${geistMono.variable}`}>
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
