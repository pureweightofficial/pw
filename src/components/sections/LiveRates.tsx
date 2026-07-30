'use client';

import { useEffect, useState } from 'react';
import { assetPath } from '@/lib/asset';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import {
  GOLD_FINENESS,
  describeAge,
  finePerGram,
  formatMoney,
  freshnessOf,
  parseRates,
  type Freshness,
  type RatesPayload,
} from '@/lib/rates';

/**
 * LIVE MARKET RATES
 *
 * The one number-bearing surface on this site, and therefore the one that has to
 * be most careful.
 *
 * WHY THIS IS NOT A WIDGET
 *
 * The obvious build — call a metals API from the browser — puts the API key in
 * the page source where anyone can lift it and burn the quota, and most providers
 * forbid it outright. So nothing here talks to a provider. It reads a small JSON
 * file that is written by CI, where the key lives as a repository secret.
 *
 * The endpoint is configurable because the two hosting shapes differ:
 *
 *   static host   a scheduled workflow rewrites /rates.json. Every rewrite is a
 *                 redeploy, so the cron is slow on purpose and `dated` is the
 *                 normal state rather than a fault.
 *   node / edge   a function holding the key answers /api/rates on demand, and
 *                 the panel sits in `live` continuously.
 *
 * One component serves both; only the writer changes.
 *
 * WHAT IT WILL NOT DO
 *
 * It will not render a number it cannot stand behind. No placeholder figures, no
 * "approximately", no last-known-good value pulled from a constant. If the feed
 * is missing, malformed, or too old, the panel says so in plain language and the
 * page reads perfectly well without it. That is the brief's rule about never
 * inventing a live gold price, expressed as a component.
 *
 * It also never calls a figure an offer. Spot is the international market price
 * for pure metal; a dealer settles below it because they carry refining, assay
 * and price risk. The per-carat rows are the market value of the FINE GOLD
 * CONTENT of a gram of alloy — a true and checkable statement — and they are
 * captioned as such every time they appear.
 */

/** Default suits the static host. A node/edge deployment points this at its own route. */
const ENDPOINT = process.env.NEXT_PUBLIC_RATES_ENDPOINT || '/rates.json';

type State =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: 'missing' | 'malformed' | 'expired' | 'error' }
  | { kind: 'ready'; rates: RatesPayload; freshness: Exclude<Freshness, 'expired'> };

export function LiveRates() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const url = /^https?:\/\//.test(ENDPOINT) ? ENDPOINT : assetPath(ENDPOINT);
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });

        // On a static host a missing file answers with the 404 HTML document, so
        // status has to be checked before anything tries to parse the body.
        if (!res.ok) {
          setState({ kind: 'unavailable', reason: 'missing' });
          return;
        }

        let body: unknown;
        try {
          body = await res.json();
        } catch {
          setState({ kind: 'unavailable', reason: 'malformed' });
          return;
        }

        const rates = parseRates(body);
        if (!rates) {
          setState({ kind: 'unavailable', reason: 'malformed' });
          return;
        }

        const freshness = freshnessOf(rates.fetchedAt, Date.now());
        if (freshness === 'expired') {
          setState({ kind: 'unavailable', reason: 'expired' });
          return;
        }

        setState({ kind: 'ready', rates, freshness });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setState({ kind: 'unavailable', reason: 'error' });
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <section
      id="rates"
      data-scroll-section="rates"
      aria-labelledby="rates-heading"
      className="relative border-y border-bronze/25 bg-char py-20 sm:py-24"
    >
      <AmbientGlow intensity="normal" placement="right" />
      <div className="shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label label-rule mb-5 text-gold-antique">Market Reference</p>
            <h2 id="rates-heading" className="font-display text-section text-ivory">
              Today&rsquo;s Precious Metal Market
            </h2>
          </div>

          {state.kind === 'ready' ? (
            <p className="text-[0.68rem] tracking-[0.16em] text-ash uppercase" aria-live="polite">
              {state.freshness === 'live' ? 'Updated ' : 'Last updated '}
              <time dateTime={state.rates.fetchedAt}>
                {describeAge(state.rates.fetchedAt, Date.now())}
              </time>
            </p>
          ) : null}
        </div>

        <div className="mt-12">
          {state.kind === 'loading' ? <Skeleton /> : null}
          {state.kind === 'unavailable' ? <Unavailable reason={state.reason} /> : null}
          {state.kind === 'ready' ? <Figures state={state} /> : null}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Skeleton() {
  return (
    <p className="text-lead text-ivory/60" role="status">
      Fetching the latest market figures&hellip;
    </p>
  );
}

/**
 * The honest empty state.
 *
 * Says what is actually true and gives the visitor somewhere to go, rather than
 * hiding the section or — far worse — showing a number to fill the space. All
 * four reasons resolve to the same advice, because from the visitor's point of
 * view the distinction between "file missing" and "payload malformed" is noise.
 */
function Unavailable({ reason }: { reason: 'missing' | 'malformed' | 'expired' | 'error' }) {
  const detail =
    reason === 'expired'
      ? 'Our market feed has not refreshed recently enough for us to publish a figure we would stand behind.'
      : 'Our market feed is temporarily unavailable.';

  return (
    <div className="max-w-2xl" role="status">
      <p className="text-lead text-ivory/72">
        {detail} Rather than show you a number that might be out of date, we would
        rather you asked us directly — we quote against the live market at the
        moment you visit.
      </p>
      <p className="mt-6 text-[0.8rem] leading-relaxed text-ash">
        Metal prices move throughout the trading day. Any figure published here is a
        market reference only; it is never an offer.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Figures({ state }: { state: Extract<State, { kind: 'ready' }> }) {
  const { rates, freshness } = state;
  const { currency } = rates;
  const gold = rates.metals.gold;
  const silver = rates.metals.silver;

  return (
    <>
      {/* Spot, the two headline figures. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <SpotCard
          metal="Gold"
          note="999 fine, per gram"
          value={formatMoney(gold.perGram, currency, 2)}
          secondary={`${formatMoney(gold.perTroyOz, currency, 2)} per troy ounce`}
        />
        <SpotCard
          metal="Silver"
          note="999 fine, per gram"
          value={formatMoney(silver.perGram, currency, 2)}
          secondary={`${formatMoney(silver.perTroyOz, currency, 2)} per troy ounce`}
        />
      </div>

      {/* Per-fineness breakdown — the figure people can actually match to the
          hallmark stamped on their own jewellery. */}
      <div className="mt-14">
        <h3 className="font-display text-[1.35rem] text-ivory">
          Market value of fine gold content, by hallmark
        </h3>
        <p className="mt-3 max-w-2xl text-[0.85rem] leading-relaxed text-ivory/72">
          Jewellery is an alloy. These figures are the market value of the pure gold
          inside one gram at each standard fineness — the hallmark number stamped on
          your piece.{' '}
          <strong className="font-normal text-gold-pale">
            They are a market reference, not an offer.
          </strong>{' '}
          What we can pay depends on the actual purity and weight once we have
          examined and weighed the item with you.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <caption className="sr-only">
              Market value of the fine gold content of one gram of alloy, by hallmark
              fineness. A market reference only, not an offer.
            </caption>
            <thead>
              <tr className="border-b border-bronze/40">
                <th scope="col" className="label py-3 pr-4 text-ash">
                  Hallmark
                </th>
                <th scope="col" className="label py-3 pr-4 text-ash">
                  Fineness
                </th>
                <th scope="col" className="label py-3 text-right text-ash">
                  Fine gold value, per gram
                </th>
              </tr>
            </thead>
            <tbody>
              {GOLD_FINENESS.map(({ karat, fineness, label }) => (
                <tr key={karat} className="border-b border-bronze/20 last:border-0">
                  <td className="py-4 pr-4 font-accent text-[1.05rem] text-ivory">{label}</td>
                  <td className="py-4 pr-4 font-mono text-[0.8rem] text-ash">{fineness}</td>
                  <td className="py-4 text-right font-mono text-[0.95rem] text-gold-high tabular-nums">
                    {formatMoney(finePerGram(gold.perGram, fineness), currency, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provenance. A number without a source and a time is not evidence. */}
      <p className="mt-10 max-w-3xl text-[0.75rem] leading-relaxed text-ash">
        {freshness === 'live'
          ? 'Live market data'
          : 'Market data, refreshed periodically rather than continuously'}{' '}
        via {rates.source.label}, retrieved{' '}
        <time dateTime={rates.fetchedAt}>{describeAge(rates.fetchedAt, Date.now())}</time>.
        Denominated in {currency}. Precious metal prices move throughout the trading
        day, and these figures are published as a market reference only — they are
        not a quotation, an offer, or a guarantee of any amount payable.
      </p>
    </>
  );
}

function SpotCard({
  metal,
  note,
  value,
  secondary,
}: {
  metal: string;
  note: string;
  value: string;
  secondary: string;
}) {
  return (
    <div className="border border-bronze/30 bg-void/40 p-8">
      <p className="label text-gold-antique">{metal}</p>
      <p className="mt-5 font-display text-[clamp(2rem,4vw,2.9rem)] text-gold-high tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[0.75rem] tracking-[0.14em] text-ash uppercase">{note}</p>
      <p className="mt-4 font-mono text-[0.78rem] text-ivory/72 tabular-nums">{secondary}</p>
    </div>
  );
}
