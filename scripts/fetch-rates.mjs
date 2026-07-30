/**
 * FETCH LIVE METAL RATES
 *
 * Runs in CI, never in the browser, because it holds an API key.
 *
 * THE ONE RULE: this script either writes REAL, SOURCED, TIMESTAMPED numbers or
 * it writes nothing at all and exits non-zero. It has no fallback values, no
 * sample data and no "approximate" mode. A stale file is recoverable — the site
 * says how old it is and stops calling it live. A fabricated file is not
 * recoverable, because nobody downstream can tell it apart from a real one.
 *
 * The brief forbids inventing live gold prices in the strongest terms it uses
 * anywhere. This is where that rule is mechanically enforced.
 *
 * ENVIRONMENT
 *   RATES_PROVIDER  one of the keys in PROVIDERS below
 *   RATES_API_KEY   the provider key — a repository secret, never committed
 *   RATES_CURRENCY  ISO 4217 code the prices should be denominated in
 *   RATES_OUT       output path (default public/rates.json)
 *
 * WHY PROVIDER-AGNOSTIC: the provider has not been chosen yet, and their free
 * tiers and response shapes differ. Each entry below normalises one provider to
 * the same output, so switching is an env change rather than a rewrite.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * Each provider returns "how much metal per unit currency" or "how much currency
 * per unit metal", and they disagree about which. Getting this backwards yields a
 * number that is wrong by four orders of magnitude, so each adapter states its
 * direction explicitly and the result is sanity-checked afterwards.
 */
const PROVIDERS = {
  metalpriceapi: {
    label: 'MetalpriceAPI',
    url: ({ key, currency }) =>
      `https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(key)}` +
      `&base=${encodeURIComponent(currency)}&currencies=XAU,XAG`,
    parse: (json, currency) => {
      if (json?.success === false) {
        throw new Error(`provider error: ${JSON.stringify(json.error ?? json)}`);
      }
      const rates = json?.rates;
      if (!rates) throw new Error('no `rates` object in response');

      // Base=<currency> yields XAU per 1 unit of currency, so invert for
      // currency per troy ounce. Providers also often supply the pre-inverted
      // value as e.g. `USDXAU`; prefer that when present.
      const perOz = (sym) => {
        const direct = rates[`${currency}${sym}`];
        if (typeof direct === 'number' && direct > 0) return direct;
        const inverse = rates[sym];
        if (typeof inverse === 'number' && inverse > 0) return 1 / inverse;
        throw new Error(`no usable rate for ${sym}`);
      };

      return { goldPerOz: perOz('XAU'), silverPerOz: perOz('XAG') };
    },
  },

  'metals-dev': {
    label: 'Metals.Dev',
    url: ({ key, currency }) =>
      `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(key)}` +
      `&currency=${encodeURIComponent(currency)}&unit=toz`,
    parse: (json) => {
      if (json?.status && json.status !== 'success') {
        throw new Error(`provider error: ${JSON.stringify(json)}`);
      }
      const metals = json?.metals;
      if (!metals) throw new Error('no `metals` object in response');
      // This provider quotes currency per unit directly.
      if (typeof metals.gold !== 'number' || typeof metals.silver !== 'number') {
        throw new Error('gold/silver missing or not numeric');
      }
      return { goldPerOz: metals.gold, silverPerOz: metals.silver };
    },
  },

  goldapi: {
    label: 'GoldAPI.io',
    // Quotes one metal per call, so gold and silver are fetched separately.
    multi: [
      { symbol: 'XAU', key: 'goldPerOz' },
      { symbol: 'XAG', key: 'silverPerOz' },
    ],
    url: ({ currency, symbol }) => `https://www.goldapi.io/api/${symbol}/${currency}`,
    headers: ({ key }) => ({ 'x-access-token': key }),
    parse: (json) => {
      const perOz = json?.price;
      if (typeof perOz !== 'number' || perOz <= 0) {
        throw new Error(`no usable price in response: ${JSON.stringify(json).slice(0, 200)}`);
      }
      return perOz;
    },
  },
};

/**
 * Refuses numbers that cannot be a real precious-metal price.
 *
 * This exists because the commonest failure here is not a network error, it is a
 * silently inverted or wrongly-scaled rate, which produces a plausible-looking
 * page showing gold at 0.0004 a gram. Bounds are deliberately wide — they are
 * catching unit and direction mistakes, not judging the market.
 */
function assertPlausible(name, perOz, currency) {
  const MIN = 1;
  const MAX = 1_000_000;
  if (!Number.isFinite(perOz) || perOz < MIN || perOz > MAX) {
    throw new Error(
      `${name} came back as ${perOz} ${currency}/troy oz, which is outside the ` +
        `sanity range ${MIN}-${MAX}. This is almost always an inverted rate or a ` +
        `unit mismatch in the provider adapter — NOT something to publish.`,
    );
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`\nMISSING ${name}.`);
    console.error('Nothing will be written. This script does not invent prices.\n');
    process.exit(2);
  }
  return v.trim();
}

const providerKey = requireEnv('RATES_PROVIDER');
const apiKey = requireEnv('RATES_API_KEY');
const currency = requireEnv('RATES_CURRENCY').toUpperCase();
const outPath = process.env.RATES_OUT?.trim() || 'public/rates.json';

const provider = PROVIDERS[providerKey];
if (!provider) {
  console.error(`Unknown RATES_PROVIDER "${providerKey}".`);
  console.error(`Known: ${Object.keys(PROVIDERS).join(', ')}`);
  process.exit(2);
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers: headers ?? {} });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`response was not JSON: ${text.slice(0, 300)}`);
  }
}

let goldPerOz;
let silverPerOz;

try {
  if (provider.multi) {
    for (const { symbol, key } of provider.multi) {
      const json = await getJson(
        provider.url({ key: apiKey, currency, symbol }),
        provider.headers?.({ key: apiKey }),
      );
      const perOz = provider.parse(json, currency);
      if (key === 'goldPerOz') goldPerOz = perOz;
      else silverPerOz = perOz;
    }
  } else {
    const json = await getJson(
      provider.url({ key: apiKey, currency }),
      provider.headers?.({ key: apiKey }),
    );
    ({ goldPerOz, silverPerOz } = provider.parse(json, currency));
  }

  assertPlausible('gold', goldPerOz, currency);
  assertPlausible('silver', silverPerOz, currency);
} catch (err) {
  console.error(`\nRate fetch FAILED via ${provider.label}: ${err.message}`);
  console.error('No file written. The site will show its rates panel as');
  console.error('unavailable, which is correct and honest.\n');
  process.exit(1);
}

const round = (n, dp) => Number(n.toFixed(dp));

const payload = {
  schema: 1,
  currency,
  // Whole seconds, UTC. The site derives "how old is this" from it and stops
  // describing the figure as live once it passes its freshness window.
  fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  source: { id: providerKey, label: provider.label },
  metals: {
    gold: { perTroyOz: round(goldPerOz, 2), perGram: round(goldPerOz / TROY_OUNCE_GRAMS, 2) },
    silver: { perTroyOz: round(silverPerOz, 2), perGram: round(silverPerOz / TROY_OUNCE_GRAMS, 4) },
  },
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`  ${provider.label} @ ${payload.fetchedAt}`);
console.log(`  gold   ${payload.metals.gold.perGram} ${currency}/g`);
console.log(`  silver ${payload.metals.silver.perGram} ${currency}/g`);
