/**
 * RATES SAFETY AUDIT
 *
 * The rates panel is the only place on this site that publishes a number about
 * the outside world, and the brief's hardest rule is that it must never invent a
 * live gold price. That rule is only worth anything if it is enforced by
 * something other than good intentions, so this asserts the two behaviours that
 * matter:
 *
 *   1. The fetch script writes REAL data or NOTHING. No key, unknown provider,
 *      or an implausible value must all produce a non-zero exit and no file.
 *   2. The parser and the ageing logic fail CLOSED. Anything malformed, partial
 *      or old resolves to "no figure", never to a guess.
 *
 * Runs as part of `npm run verify`, needs no network and no key.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DATED_WINDOW_MS,
  GOLD_FINENESS,
  LIVE_WINDOW_MS,
  TROY_OUNCE_GRAMS,
  describeAge,
  finePerGram,
  freshnessOf,
  parseRates,
} from '../src/lib/rates.ts';

let failures = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nFETCH SCRIPT — must refuse to invent');
/* -------------------------------------------------------------------------- */

const scratch = mkdtempSync(join(tmpdir(), 'pw-rates-'));
const out = join(scratch, 'rates.json');

function runFetch(env) {
  const res = spawnSync(
    process.execPath,
    ['scripts/fetch-rates.mjs'],
    // A deliberately empty base env, so a real key in the developer's shell
    // cannot accidentally make these cases pass.
    { env: { PATH: process.env.PATH, RATES_OUT: out, ...env }, encoding: 'utf8' },
  );
  return { code: res.status, stderr: res.stderr ?? '', wrote: existsSync(out) };
}

const noKey = runFetch({ RATES_PROVIDER: 'metalpriceapi', RATES_CURRENCY: 'GBP' });
check('missing API key exits non-zero', noKey.code !== 0, `exit ${noKey.code}`);
check('missing API key writes no file', !noKey.wrote);
check('missing API key says so plainly', /MISSING RATES_API_KEY/.test(noKey.stderr));
check(
  'missing API key states it will not invent prices',
  /does not invent prices/i.test(noKey.stderr),
);

const noCurrency = runFetch({ RATES_PROVIDER: 'metalpriceapi', RATES_API_KEY: 'x' });
check('missing currency exits non-zero', noCurrency.code !== 0);
check('missing currency writes no file', !noCurrency.wrote);

const badProvider = runFetch({
  RATES_PROVIDER: 'not-a-provider',
  RATES_API_KEY: 'x',
  RATES_CURRENCY: 'GBP',
});
check('unknown provider exits non-zero', badProvider.code !== 0);
check('unknown provider writes no file', !badProvider.wrote);
check('unknown provider lists the known ones', /Known:/.test(badProvider.stderr));

rmSync(scratch, { recursive: true, force: true });

/* -------------------------------------------------------------------------- */
console.log('\nPARSER — must fail closed');
/* -------------------------------------------------------------------------- */

const valid = {
  schema: 1,
  currency: 'GBP',
  fetchedAt: '2026-07-30T12:00:00Z',
  source: { id: 'metalpriceapi', label: 'MetalpriceAPI' },
  metals: {
    gold: { perTroyOz: 1900, perGram: 61.09 },
    silver: { perTroyOz: 22.5, perGram: 0.7234 },
  },
};

check('a well-formed payload parses', parseRates(valid) !== null);

const rejects = [
  ['null', null],
  ['a string', 'nope'],
  ['an array', []],
  // The realistic one: a static host answers a missing file with its 404 page.
  ['an HTML 404 body', '<!doctype html><html><body>404</body></html>'],
  ['a future schema version', { ...valid, schema: 2 }],
  ['a missing currency', { ...valid, currency: undefined }],
  ['a non-ISO currency', { ...valid, currency: 'pounds' }],
  ['a lowercase currency', { ...valid, currency: 'gbp' }],
  ['an unparseable timestamp', { ...valid, fetchedAt: 'yesterday' }],
  ['a missing metals block', { ...valid, metals: undefined }],
  ['a missing silver rate', { ...valid, metals: { gold: valid.metals.gold } }],
  ['a zero price', { ...valid, metals: { ...valid.metals, gold: { perTroyOz: 0, perGram: 0 } } }],
  [
    'a negative price',
    { ...valid, metals: { ...valid.metals, gold: { perTroyOz: -1900, perGram: -61 } } },
  ],
  [
    'a stringified price',
    { ...valid, metals: { ...valid.metals, gold: { perTroyOz: '1900', perGram: '61' } } },
  ],
  [
    'a NaN price',
    { ...valid, metals: { ...valid.metals, gold: { perTroyOz: NaN, perGram: NaN } } },
  ],
  [
    'a partial metal object',
    { ...valid, metals: { ...valid.metals, gold: { perTroyOz: 1900 } } },
  ],
];

for (const [label, input] of rejects) {
  check(`rejects ${label}`, parseRates(input) === null);
}

/* -------------------------------------------------------------------------- */
console.log('\nAGEING — must stop calling old data live');
/* -------------------------------------------------------------------------- */

const now = Date.parse('2026-07-30T12:00:00Z');
const at = (msAgo) => new Date(now - msAgo).toISOString();

check("fresh data is 'live'", freshnessOf(at(60 * 1000), now) === 'live');
check("data at the live boundary is 'live'", freshnessOf(at(LIVE_WINDOW_MS), now) === 'live');
check(
  "data just past the live window is 'dated'",
  freshnessOf(at(LIVE_WINDOW_MS + 1000), now) === 'dated',
);
check(
  "data past the dated window is 'expired'",
  freshnessOf(at(DATED_WINDOW_MS + 1000), now) === 'expired',
);
check(
  "a two-day-old price is 'expired', not shown",
  freshnessOf(at(48 * 60 * 60 * 1000), now) === 'expired',
);
check(
  "a far-future timestamp is 'expired' (clock skew or bad payload)",
  freshnessOf(new Date(now + 60 * 60 * 1000).toISOString(), now) === 'expired',
);
check("an unparseable timestamp is 'expired'", freshnessOf('not a date', now) === 'expired');

check('age reads in minutes under an hour', describeAge(at(25 * 60 * 1000), now) === '25 minutes ago');
check('age reads in hours over an hour', /hours? ago/.test(describeAge(at(3 * 3600 * 1000), now)));
check('age reads in days when very old', /days? ago/.test(describeAge(at(50 * 3600 * 1000), now)));

/* -------------------------------------------------------------------------- */
console.log('\nPURITY MATHS');
/* -------------------------------------------------------------------------- */

check('one troy ounce is 31.1034768 g', Math.abs(TROY_OUNCE_GRAMS - 31.1034768) < 1e-9);

// Hallmark standards, not karat/24. 22ct is stamped 916, not 916.67.
const byKarat = Object.fromEntries(GOLD_FINENESS.map((g) => [g.karat, g.fineness]));
check('24ct is 999', byKarat[24] === 999);
check('22ct is 916 (hallmark, not 916.67)', byKarat[22] === 916);
check('18ct is 750', byKarat[18] === 750);
check('14ct is 585 (hallmark, not 583.3)', byKarat[14] === 585);
check('9ct is 375', byKarat[9] === 375);

const spot = 61.09;
check('999 fine is essentially spot', Math.abs(finePerGram(spot, 999) - spot * 0.999) < 1e-9);
check('750 fine is three quarters of spot', Math.abs(finePerGram(spot, 750) - spot * 0.75) < 1e-9);
check('fineness value is always below spot', GOLD_FINENESS.every((g) => finePerGram(spot, g.fineness) < spot));
check(
  'fineness values descend with carat',
  GOLD_FINENESS.every(
    (g, i, arr) => i === 0 || finePerGram(spot, g.fineness) < finePerGram(spot, arr[i - 1].fineness),
  ),
);

/* -------------------------------------------------------------------------- */

console.log('');
if (failures) {
  console.log(`RATES AUDIT FAILED — ${failures} check(s)\n`);
  process.exit(1);
}
console.log('RATES AUDIT PASSED — the feed cannot publish an invented price\n');
