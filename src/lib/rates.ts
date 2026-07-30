/**
 * LIVE METAL RATES — parsing, ageing and purity maths.
 *
 * Deliberately free of React and of fetch, so the two things most likely to be
 * wrong here — how old a price is allowed to be before it stops being described
 * as live, and how fine gold content converts to a market value — are plain
 * functions that can be reasoned about and tested directly.
 *
 * THE GOVERNING CONSTRAINT
 *
 * The brief's hardest rule is that this site must never invent a live gold price.
 * Everything below is built so that the failure mode is SILENCE, never a number:
 * a malformed payload, a missing field, an implausible value or an old timestamp
 * all resolve to "unavailable" rather than to a best guess.
 *
 * The second-hardest problem is subtler and is about wording rather than data. A
 * spot price is the international market price for PURE metal. A dealer does not
 * pay spot — they pay a margin below it, because they carry refining, assay and
 * price risk. So a figure on this page must never be phrased, positioned or
 * captioned as an offer, a quote, or "what you will get". `Basis` exists to make
 * that distinction explicit in the type system rather than leaving it to
 * whoever writes the caption.
 */

/** Grams in one troy ounce, the unit precious metals are quoted in. */
export const TROY_OUNCE_GRAMS = 31.1034768;

export type MetalRate = {
  perTroyOz: number;
  perGram: number;
};

export type RatesPayload = {
  schema: number;
  currency: string;
  fetchedAt: string;
  source: { id: string; label: string };
  metals: { gold: MetalRate; silver: MetalRate };
};

/**
 * What a displayed figure actually IS. There is exactly one legitimate value
 * today, and it is not an offer.
 *
 * If the client later confirms a pricing basis — dealers typically settle at a
 * stated percentage of spot — a second variant can be added and the caption
 * logic will be forced to handle it. Until then the type makes it impossible to
 * accidentally present spot as a settlement price.
 */
export type Basis = 'market-spot';

/* -------------------------------------------------------------------------- */
/* AGEING                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How long a metal price may be presented, and how it must be described.
 *
 * `live`  — recent enough that "live" is a truthful word.
 * `dated` — still worth showing, but must be captioned with its actual age and
 *           must not be called live.
 * `expired` — too old to show at all. Gold moves; a figure from two days ago
 *           dressed up as a market indication is misleading, and suppressing it
 *           costs nothing because the page reads perfectly well without it.
 *
 * The Pages preview refreshes on a slow cron precisely because every refresh is
 * a redeploy, so `dated` is the EXPECTED state there, not an error. A production
 * host with a serverless fetch would sit in `live` continuously.
 */
export type Freshness = 'live' | 'dated' | 'expired';

export const LIVE_WINDOW_MS = 60 * 60 * 1000;
export const DATED_WINDOW_MS = 36 * 60 * 60 * 1000;

export function freshnessOf(fetchedAt: string, now: number): Freshness {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return 'expired';

  const age = now - t;
  // A timestamp meaningfully in the future means clock skew or a bad payload.
  // Either way it is not trustworthy, so it is not shown.
  if (age < -5 * 60 * 1000) return 'expired';
  if (age <= LIVE_WINDOW_MS) return 'live';
  if (age <= DATED_WINDOW_MS) return 'dated';
  return 'expired';
}

/** Human age, in the coarsest unit that is still honest. */
export function describeAge(fetchedAt: string, now: number): string {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return 'unknown';

  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'moments ago';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 36) return `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

/* -------------------------------------------------------------------------- */
/* VALIDATION                                                                 */
/* -------------------------------------------------------------------------- */

const isPositiveNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

function parseMetal(raw: unknown): MetalRate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { perTroyOz, perGram } = raw as Record<string, unknown>;
  if (!isPositiveNumber(perTroyOz) || !isPositiveNumber(perGram)) return null;
  return { perTroyOz, perGram };
}

/**
 * Turns an untrusted response body into a payload, or null.
 *
 * Returns null rather than throwing, and rather than filling gaps: a partial
 * payload is not a payload. Note that on a static host a missing file answers
 * with the 404 HTML page, so this is routinely handed something that is not
 * remotely a rates object.
 */
export function parseRates(raw: unknown): RatesPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const { schema, currency, fetchedAt, source, metals } = raw as Record<string, unknown>;

  if (schema !== 1) return null;
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return null;
  if (typeof fetchedAt !== 'string' || !Number.isFinite(Date.parse(fetchedAt))) return null;
  if (typeof metals !== 'object' || metals === null) return null;

  const { gold, silver } = metals as Record<string, unknown>;
  const goldRate = parseMetal(gold);
  const silverRate = parseMetal(silver);
  if (!goldRate || !silverRate) return null;

  const src = (typeof source === 'object' && source !== null ? source : {}) as Record<
    string,
    unknown
  >;

  return {
    schema: 1,
    currency,
    fetchedAt,
    source: {
      id: typeof src.id === 'string' ? src.id : 'unknown',
      label: typeof src.label === 'string' ? src.label : 'market data provider',
    },
    metals: { gold: goldRate, silver: silverRate },
  };
}

/* -------------------------------------------------------------------------- */
/* PURITY                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Hallmark finenesses, as parts per thousand.
 *
 * These are the real trade figures, not karat/24. 22 carat is hallmarked 916,
 * not 916.67; 14 carat is 585, not 583.3. Using the arithmetic fraction instead
 * of the hallmark standard would put every figure very slightly out and would
 * not match anything a customer can read off their own jewellery.
 */
export const GOLD_FINENESS = [
  { karat: 24, fineness: 999, label: '24 carat' },
  { karat: 22, fineness: 916, label: '22 carat' },
  { karat: 18, fineness: 750, label: '18 carat' },
  { karat: 14, fineness: 585, label: '14 carat' },
  { karat: 9, fineness: 375, label: '9 carat' },
] as const;

/**
 * Market value of the fine gold content of one gram at a given fineness.
 *
 * This is emphatically NOT what anyone will be paid. It is the market value of
 * the pure gold inside a gram of alloy, which is a different and verifiable
 * statement. Every surface that renders it has to say so.
 */
export function finePerGram(spotPerGram: number, fineness: number): number {
  return spotPerGram * (fineness / 1000);
}

/* -------------------------------------------------------------------------- */
/* FORMATTING                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Currency formatting via Intl, with a plain fallback.
 *
 * The currency comes from the feed rather than from a hardcoded symbol, because
 * the trading jurisdiction is still an unconfirmed business fact — hardcoding a
 * symbol would be exactly the kind of quiet assumption this project keeps
 * getting caught by.
 */
export function formatMoney(value: number, currency: string, dp: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    }).format(value);
  } catch {
    return `${value.toFixed(dp)} ${currency}`;
  }
}
