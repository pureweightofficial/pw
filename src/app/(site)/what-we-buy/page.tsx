import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { brand, canonicalPath, ogFor } from '@/lib/site';

/**
 * WHAT WE BUY — the dedicated page behind the nav item.
 *
 * The homepage section is the cinematic version; this page is the READABLE
 * one: a proper reference a first-time seller can sit with, and the page an
 * answer engine should cite when someone asks what a gold buyer will take.
 * Everything here is trade-standard knowledge in the site's voice. Business
 * promises — fees, timings, guarantees — appear nowhere; those remain
 * governed by the verified-facts system and live on the contact page only
 * once confirmed.
 */

const TITLE = 'What We Buy — Gold, Silver, Coins & Bullion';
const DESCRIPTION =
  'What a gold buyer will actually take: jewellery in any condition, sterling and continental silver, sovereigns and bullion coins, and cast or minted bars — and what decides the value of each.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonicalPath('/what-we-buy') },
  openGraph: ogFor({
    title: `${TITLE} — ${brand.name}`,
    description: DESCRIPTION,
    path: '/what-we-buy',
  }),
};

export default function WhatWeBuyPage() {
  return (
    <Section material="steel" labelledBy="wwb-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-8">What We Buy</Eyebrow>
          <h1 id="wwb-heading" className="font-display text-chapter font-normal text-ivory">
            Gold, silver, coins
            <span className="accent-italic text-gold-high/90"> and bullion</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Four categories cover nearly everything that comes across a
            precious-metal counter. Here is what belongs in each, what decides
            its value, and what is worth knowing before you bring yours in.
          </p>

          <div className="article-body mt-14">
            <h2>Gold jewellery — in any condition</h2>
            <p>
              Jewellery is what most people actually own: chains, rings,
              bracelets, earrings, pendants, and the drawer of odds and ends
              that accumulates around them. The condition bar is far lower than
              sellers expect. A snapped chain contains exactly as much gold as
              an intact one. A single earring, a bent brooch pin, a ring whose
              stone fell out years ago — none of these lose their metal value
              by being broken, and none of them need repairing first. A repair
              almost never returns more than it costs.
            </p>
            <p>
              What decides jewellery&apos;s value is not how it looks but what
              it measures: the carat of the alloy, the weight of actual gold
              once stones and steel springs are allowed for, and the market
              reference on the day. A heavy 9ct chain can be worth less than a
              much lighter 22ct bangle, because a 9ct alloy is only nine parts
              gold in twenty-four. If the carat marks on your pieces are worn
              or missing, that is normal — fineness is then established by
              examination rather than read off the metal. Our guide to{' '}
              <Link href="/purity-and-weight">purity and weight</Link> explains
              exactly how those marks work.
            </p>
            <p>
              Two things are worth doing before a visit: nothing, and
              specifically not cleaning. Polishing risks damaging stones and
              softening old settings, and on antique pieces it can remove
              patina that matters. Bring items exactly as they are.
            </p>

            <h2>Silver — hallmarked, continental, and plate</h2>
            <p>
              Silver is weighed and assessed on the same basis as gold, against
              its own market price. The pieces that carry real value are solid
              silver: sterling (925 parts per thousand, the standard for
              British hallmarked silver), continental grades such as 800 and
              835, and older coin silver. Jewellery, cutlery, tableware,
              candlesticks and dressing-table sets all qualify if the metal
              itself is solid.
            </p>
            <p>
              The honest complication is plate. Electroplated pieces — often
              marked EPNS, EPBM, or &ldquo;silver plated&rdquo; — carry only a
              microscopically thin layer of silver over a base metal, and
              contain almost no recoverable silver at all. A responsible buyer
              identifies plate plainly and says so, rather than weighing it
              with the solid pieces and letting the seller assume otherwise.
              If you are unsure which you have, bring it anyway: telling the
              difference is part of the assessment, not your homework.
            </p>

            <h2>Coins — weighed once, considered twice</h2>
            <p>
              Precious-metal coins are looked at in two distinct ways, and the
              difference can be worth real money to you. The first reading is
              bullion value: the coin&apos;s fine metal content multiplied by
              the market reference. A full gold sovereign, for example, has a
              fixed specification — 7.99 grams of 22ct gold, of which about
              7.32 grams is pure — so its floor value moves directly with the
              gold price. Krugerrands, Britannias, and most modern bullion
              issues work the same way.
            </p>
            <p>
              The second reading is collector value. Some coins are worth more
              than their metal because of date, mint mark, rarity or
              condition, and melting one down would destroy that premium. The
              professional obligation is to tell you when the coin in your
              hand is worth more as a coin — pre-decimal proof sets, low-
              mintage years and unusual strikes deserve that check. A pile of
              inherited coins should never be priced as scrap by default.
            </p>

            <h2>Bars and bullion — the stamp is checked, not trusted</h2>
            <p>
              Investment bars, from one-gram minted wafers to cast kilobars,
              state their own weight and fineness on their face, usually with
              a refiner&apos;s mark and a serial number. Those stamps are
              claims, and claims get verified: the stated weight is checked on
              the scale, and the fineness is verified against the metal rather
              than assumed from the engraving. Recognised bullion in good
              order is handled on its own terms — as investment metal with a
              published specification — rather than being treated as scrap.
            </p>
            <p>
              Bars without paperwork, or older bars from refiners no longer
              operating, are still worth bringing in. The assessment simply
              leans harder on measurement, which is how every serious
              valuation works anyway. The process is the same one described
              step by step in <Link href="/how-it-works">how it works</Link>.
            </p>

            <h2>What sits outside the four categories</h2>
            <p>
              Some items contain precious metal without being obvious about
              it: older watch cases, dental gold, medals, thimbles,
              cigarette cases, and broken spectacle frames from the era when
              frames were made properly. If it might be gold or silver, it is
              worth an assessment — the answer costs you a conversation.
              Conversely, some convincing items contain nothing recoverable:
              rolled gold, gold-filled pieces and costume jewellery imitate
              the look without the metal. Being told clearly which is which is
              precisely what the counter visit is for.
            </p>

            <h2>Before you visit</h2>
            <p>
              Nothing needs sorting, cleaning or valuing beforehand, and there
              is no minimum worth bringing. If you want to prepare anyway, the
              most useful step is reading the{' '}
              <Link href="/faq">frequently asked questions</Link> — carat,
              troy ounces and hallmarks in plain language — so the figures you
              hear at the counter already make sense.
            </p>
          </div>

          <div className="mt-16 flex flex-wrap gap-4 border-t border-gold-antique/16 pt-10">
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
            <Link href="/#services" className="btn-ghost">
              See the four categories
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
