import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { pageMetadata } from '@/lib/seo';

/**
 * PURITY & WEIGHT — the dedicated page behind the nav item.
 *
 * The reference chapter. Everything here is trade-standard, independently
 * checkable fact: the carat scale, millesimal fineness, hallmarking, troy
 * weight, and how testing works in general. It is deliberately the most
 * citation-shaped page on the site — definitions first, tables where tables
 * are honest, and no business claims anywhere.
 */

const TITLE = 'Purity & Weight — Carat, Fineness, Hallmarks and Troy Ounces';
const DESCRIPTION =
  'The measurements behind every gold valuation: the carat scale and millesimal fineness, how hallmarks are read, why precious metals use troy ounces, and how purity is actually verified.';

export const metadata: Metadata = pageMetadata(
  "purity-and-weight",
  "/purity-and-weight",
  { title: TITLE, description: DESCRIPTION },
);

const FINENESS_TABLE: { carat: string; fineness: string; goldContent: string }[] = [
  { carat: '24ct', fineness: '999', goldContent: 'Pure gold — 99.9%+' },
  { carat: '22ct', fineness: '916', goldContent: '22 parts in 24 — 91.6%' },
  { carat: '18ct', fineness: '750', goldContent: '18 parts in 24 — 75.0%' },
  { carat: '14ct', fineness: '585', goldContent: '14 parts in 24 — 58.5%' },
  { carat: '9ct', fineness: '375', goldContent: '9 parts in 24 — 37.5%' },
];

export default function PurityAndWeightPage() {
  return (
    <Section material="steel" labelledBy="pw-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-8">Purity &amp; Weight</Eyebrow>
          <h1 id="pw-heading" className="font-display text-chapter font-normal text-ivory">
            Value is not guessed.
            <span className="accent-italic text-gold-high/90"> It is measured.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Every honest gold valuation is built from two measurements — how
            much metal, and how pure — read against a market reference. This
            page explains all three, in the units the trade actually uses.
          </p>

          <div className="article-body mt-14">
            <h2>The carat scale: purity in twenty-fourths</h2>
            <p>
              Carat expresses how much of an alloy is gold, as a fraction of
              24. Pure gold is 24 carat; a 9ct alloy is nine parts gold and
              fifteen parts other metals. The remainder — usually copper,
              silver or zinc — exists for hardness and colour, and it carries
              no precious-metal value. This single fact explains most of the
              surprises first-time sellers meet: a chunky 9ct chain can be
              outvalued by a delicate 22ct bangle, because carat multiplies
              weight before the market price ever enters the calculation.
            </p>
            <p>
              One warning about the word itself: carat with a C measures gold
              purity, while karat is the American spelling of the same thing —
              but <em>carat</em> applied to gemstones is a unit of weight
              (0.2 grams), not purity. A &ldquo;2-carat ring&rdquo; in a
              jeweller&apos;s window is describing its diamond, not its gold.
            </p>

            <h2>Millesimal fineness: the same truth in thousandths</h2>
            <p>
              Modern marks usually state purity in parts per thousand. The
              mapping to carats is fixed and worth knowing by heart, because
              the number stamped inside your ring band is almost certainly one
              of these:
            </p>
            {/*
              A REAL TABLE, because this is real tabular data.

              It was a bulleted list, and the constant was already named
              FINENESS_TABLE — three columns wearing a list's clothes. The
              audit made the cost concrete: this is the most table-shaped
              content on the site, and a table snippet is one of the few
              result formats that can put an entire mapping on screen before
              anyone clicks. A list cannot win one.

              It also serves the person actually holding the ring better, who
              wants to find one row rather than read five sentences.
            */}
            <table className="fineness-table">
              <caption className="sr-only">
                Carat to millesimal fineness, with the gold content of each
              </caption>
              <thead>
                <tr>
                  <th scope="col">Carat</th>
                  <th scope="col">Fineness</th>
                  <th scope="col">Gold content</th>
                </tr>
              </thead>
              <tbody>
                {FINENESS_TABLE.map((row) => (
                  <tr key={row.carat}>
                    <th scope="row">{row.carat}</th>
                    <td>{row.fineness}</td>
                    <td>{row.goldContent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              A ring stamped 750 and a ring sold as 18ct are making exactly
              the same claim. Continental jewellery leans on the millesimal
              numbers; older British pieces often carry the carat figure
              alongside. Silver uses the same system — sterling is 925, and
              continental grades such as 800 and 835 are common in inherited
              cutlery and tableware.
            </p>

            <h2>Hallmarks: the claim, witnessed</h2>
            <p>
              A hallmark is a set of marks struck into a piece recording its
              fineness — and, in full hallmarking systems, the assay office
              that tested it and the sponsor who submitted it. Look inside
              ring bands, on clasps and jump rings, on the reverse of
              pendants, and near the rims of cups and candlesticks.
            </p>
            <p>
              Plenty of genuine gold carries no hallmark at all. Marks wear
              away with decades of skin contact; pieces made before marking
              requirements, or in countries where marking is not customary,
              never had them; and small items are often exempt below certain
              weights. An unmarked piece is therefore not a red flag — it
              simply means fineness must be established by examination rather
              than read off the metal. The reverse caution also applies: a
              stamp is a claim, and claims are tested. Worn marks misread,
              plated pieces imitate solid ones, and occasionally a stamp is
              simply wrong.
            </p>

            <h2>How purity is actually verified</h2>
            <p>
              The trade has a ladder of tests, ordered by how much they
              disturb the piece. Reading the hallmark under magnification is
              the first step. Density checks exploit gold&apos;s unusual
              heaviness. Touchstone and acid testing read how the alloy
              responds at the surface. Electronic and X-ray fluorescence
              instruments estimate composition without marking the piece at
              all. Serious assessment combines methods rather than trusting
              one, because each has blind spots — and plating is specifically
              designed to fool the quick look.
            </p>

            <h2>Troy weight: why your scales disagree</h2>
            <p>
              Precious metals are weighed in troy ounces. One troy ounce is
              31.1035 grams — roughly ten per cent heavier than the 28.3495-
              gram avoirdupois ounce used for everyday goods. This is the
              single most common source of confusion at any counter: two
              people quote &ldquo;an ounce&rdquo;, mean different units, and
              believe they disagree about the metal when they only disagree
              about the dictionary. Kitchen scales also drift and round;
              trade scales are calibrated and read to fractions of a gram.
              When your reading at home differs slightly from the counter
              reading in front of you, the unit and the instrument are almost
              always the explanation.
            </p>
            <p>
              The gram sidesteps the whole problem, which is why itemised
              assessments usually speak in grams: a stated weight in grams,
              times a fineness, times a per-gram reference, is arithmetic
              anyone can check on their phone.
            </p>

            <h2>What is deliberately excluded from the weight</h2>
            <p>
              Stones, clasps, springs, pins, solder and cores all add mass
              without adding precious metal. A proper valuation separates
              them: gemstones are allowed for rather than bought as gold, and
              steel mechanisms are excluded openly. This is why an itemised
              figure and a single lump-sum figure for the same pile can
              differ considerably — and why the itemised one deserves more of
              your trust. What that assessment looks like in practice, stage
              by stage, is covered in <Link href="/how-it-works">how it works</Link>;
              what each category of item is assessed for is in{' '}
              <Link href="/what-we-buy">what we buy</Link>.
            </p>

            <h2>The fifth factor: the reference price</h2>
            <p>
              Weight and purity are properties of your metal. The reference
              price is a property of the day: precious metals trade
              continuously, and any figure you are offered relates to the
              market at the moment of assessment. The practical consequence
              is simple — a valuation is a measurement with a timestamp, not
              a permanent property of the piece. The measured facts (weight,
              fineness) stay true; the money they convert to moves with the
              market.
            </p>
          </div>

          <div className="mt-16 flex flex-wrap gap-4 border-t border-gold-antique/16 pt-10">
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
            <Link href="/faq" className="btn-ghost">
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
