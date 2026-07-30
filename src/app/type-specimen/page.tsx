import type { Metadata } from 'next';
import { Cinzel, Playfair_Display, Rye, Yeseva_One } from 'next/font/google';
import { Logo } from '@/components/brand/Logo';

/**
 * TYPE SPECIMEN — a design tool, not part of the site.
 *
 * Choosing a display face from names on a list is guesswork. This renders every
 * candidate at real display size, on the real ground colour, directly beneath
 * the actual logo, so the decision can be made by eye in the one comparison
 * that matters: does this letterform belong to the same brand as that mark?
 *
 * Each face is declared here rather than in the root layout, so the candidates
 * are only downloaded when this page is opened and never ship to a visitor.
 *
 * DELETE THIS ROUTE once the face is chosen.
 */

export const metadata: Metadata = {
  title: 'Type specimen (internal)',
  robots: { index: false, follow: false, nocache: true },
};

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--sp-cinzel' });
const rye = Rye({ subsets: ['latin'], weight: '400', variable: '--sp-rye' });
const yeseva = Yeseva_One({ subsets: ['latin'], weight: '400', variable: '--sp-yeseva' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--sp-playfair',
});

type Candidate = {
  id: string;
  name: string;
  stack: string;
  weight: number;
  tracking: string;
  classification: string;
  lowercase: string;
  italic: string;
  verdict: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: 'cinzel',
    name: 'Cinzel',
    stack: 'var(--sp-cinzel)',
    weight: 600,
    tracking: '0.005em',
    classification: 'Roman inscriptional capitals (Trajan lineage)',
    lowercase: 'None — renders as small capitals',
    italic: 'No',
    verdict:
      'Currently live. Reads as struck into stone or metal, which matches the brand idea. But its serifs are fine and tapered where your mark’s are blunt and flared, so it is a match of *feeling* rather than of letterform.',
  },
  {
    id: 'rye',
    name: 'Rye',
    stack: 'var(--sp-rye)',
    weight: 400,
    tracking: '0.01em',
    classification: 'Victorian slab / Tuscan display',
    lowercase: 'Yes, true lowercase',
    italic: 'No',
    verdict:
      'Closest to your logo’s actual serif shape — heavy, blunt, flared, high contrast. The risk is period: it carries a Wild-West saloon association that may read as playful rather than as a trusted gold house.',
  },
  {
    id: 'yeseva',
    name: 'Yeseva One',
    stack: 'var(--sp-yeseva)',
    weight: 400,
    tracking: '0',
    classification: 'Vintage display, Art-Nouveau leaning',
    lowercase: 'Yes, true lowercase',
    italic: 'No',
    verdict:
      'Heavy and vintage with genuine lowercase, so headlines keep sentence case. Softer and more decorative than your mark — less engraved, more hand-lettered signwriting.',
  },
  {
    id: 'playfair',
    name: 'Playfair Display 900',
    stack: 'var(--sp-playfair)',
    weight: 900,
    tracking: '-0.01em',
    classification: 'Transitional / Didone, at heaviest weight',
    lowercase: 'Yes, true lowercase',
    italic: 'Yes — the only candidate with one',
    verdict:
      'Worth seeing before ruling out. At 900 rather than the 400 the site had, it gains real mass and reads far more vintage. And it is the only candidate with a true italic, which would let the accent lines use one family instead of two.',
  },
];

export default function TypeSpecimenPage() {
  return (
    <div
      className={`${cinzel.variable} ${rye.variable} ${yeseva.variable} ${playfair.variable} min-h-screen bg-void pb-32 pt-28`}
    >
      <div className="shell">
        {/* --- The reference the decision is made against ---------------- */}
        <header className="border-b border-gold-antique/20 pb-12">
          <p className="label mb-8">Internal — type specimen</p>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ash">
            Each candidate below is set at real display size on the real ground colour. Compare each
            one against the mark, not against the others: the question is whether that letterform
            belongs to the same brand as this logo.
          </p>
          <Logo variant="wordmark" priority className="w-full max-w-xl" />
        </header>

        {CANDIDATES.map((c) => (
          <section key={c.id} className="border-b border-gold-antique/14 py-16">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <h2
                className="text-3xl text-ivory"
                style={{ fontFamily: c.stack, fontWeight: c.weight }}
              >
                {c.name}
              </h2>
              <p className="font-mono text-[0.62rem] tracking-[0.2em] text-gold-antique uppercase">
                {c.classification}
              </p>
            </div>

            {/* Hero headline, at the size it actually renders. */}
            <p
              className="text-ivory"
              style={{
                fontFamily: c.stack,
                fontWeight: c.weight,
                letterSpacing: c.tracking,
                fontSize: 'clamp(2.4rem, 6vw, 5.5rem)',
                lineHeight: 0.98,
              }}
            >
              Where Gold Finds
              <br />
              <span
                style={{
                  backgroundImage: 'linear-gradient(135deg,#fef3c7 0%,#fcc933 45%,#b87914 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Its True Weight.
              </span>
            </p>

            {/* A chapter heading and a smaller title, where legibility bites. */}
            <p
              className="mt-10 text-ivory/90"
              style={{
                fontFamily: c.stack,
                fontWeight: c.weight,
                letterSpacing: c.tracking,
                fontSize: 'clamp(1.5rem, 3vw, 2.6rem)',
              }}
            >
              From Weight to True Value
            </p>
            <p
              className="mt-5 text-ivory/80"
              style={{ fontFamily: c.stack, fontWeight: c.weight, fontSize: '1.35rem' }}
            >
              Jewellery Evaluation · Bullion Exchange · 22ct 916
            </p>

            <dl className="mt-10 grid gap-x-10 gap-y-3 text-sm sm:grid-cols-[auto_1fr] sm:max-w-2xl">
              <dt className="text-ash">Lowercase</dt>
              <dd className="text-ivory/80">{c.lowercase}</dd>
              <dt className="text-ash">Italic</dt>
              <dd className="text-ivory/80">{c.italic}</dd>
            </dl>

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ash">{c.verdict}</p>
          </section>
        ))}

        <footer className="pt-12">
          <p className="max-w-2xl text-sm leading-relaxed text-ash">
            Tell me which name and it is a two-line change — the import in{' '}
            <code className="text-gold-antique">layout.tsx</code> and the{' '}
            <code className="text-gold-antique">--font-vintage</code> token. This route is{' '}
            <code className="text-gold-antique">noindex</code> and should be deleted once the
            decision is made.
          </p>
        </footer>
      </div>
    </div>
  );
}
