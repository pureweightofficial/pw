/**
 * DOES THE CANONICAL HOST ACTUALLY SERVE THIS SITE?
 *
 * Every page carries `<link rel="canonical">`, the sitemap lists absolute URLs,
 * and the OG card points at an absolute image. All three are built from
 * `brand.url`, which comes from NEXT_PUBLIC_SITE_URL. That variable is set
 * OUTSIDE this repository — in the Vercel project's environment — so nothing in
 * the codebase, and no existing gate, could tell whether it names a host that
 * serves this site.
 *
 * It did not. NEXT_PUBLIC_SITE_URL was set to https://www.pureweight.gold, a
 * registered but PARKED domain whose entire response is 114 bytes:
 *
 *     <script>window.onload=function(){window.location.href="/lander"}</script>
 *
 * So every page of the live site declared that its authoritative version lived
 * on a parking page, and the sitemap offered a search engine a list of them.
 * For a business whose whole strategy is being findable, that is close to the
 * worst possible silent failure: the site works perfectly, looks perfect, and
 * quietly disclaims itself.
 *
 * Nothing caught it because nothing had ever looked. This looks.
 *
 * WHAT IT CHECKS
 *   1. The canonical origin resolves and answers.
 *   2. What it serves is THIS site — matched on a marker only this build emits,
 *      not on a 200, because a parking page returns 200 very happily.
 *   3. The apex answers too, or redirects to the canonical host. A domain where
 *      example.com 404s while www.example.com works is broken for most people,
 *      because most people do not type www.
 *
 * Usage:  npm run check:canonical [url]
 *   url defaults to the canonical declared by the live production site.
 */

const DEFAULT_ORIGIN = "https://pw-peach-psi.vercel.app";

/* A string this build emits and a parking page will not. The hero headline is
   content and could be edited, so this uses the framework's own runtime marker
   plus the brand name — both would have to vanish for this to false-pass. */
const MARKERS = ["/_next/static", "Pureweight"];

const target = process.argv[2];

async function get(url, { redirect = "follow" } = {}) {
  try {
    const res = await fetch(url, {
      redirect,
      headers: { "user-agent": "pureweight-canonical-check" },
      signal: AbortSignal.timeout(25000),
    });
    const body = res.headers.get("content-type")?.includes("text")
      ? await res.text()
      : "";
    return { ok: true, status: res.status, url: res.url, body, headers: res.headers };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 120) };
  }
}

/* Where the live site SAYS it lives. Read from the deployment rather than
   hard-coded, because the whole point is to catch the value drifting. */
async function declaredCanonical(origin) {
  const r = await get(`${origin}/`);
  if (!r.ok) return null;
  const m = r.body.match(/<link rel="canonical" href="([^"]+)"/);
  return m ? m[1] : null;
}

const problems = [];
const notes = [];

const origin = target || DEFAULT_ORIGIN;
const canonical = target || (await declaredCanonical(origin));

if (!canonical) {
  console.error(`\n  Could not read a canonical from ${origin}. Is it reachable?\n`);
  process.exit(1);
}

const canonicalOrigin = new URL(canonical).origin;
const host = new URL(canonical).host;
const apexHost = host.replace(/^www\./, "");
const apexOrigin = `https://${apexHost}`;

console.log(`\n  canonical declared: ${canonicalOrigin}`);

/* ---- 1 & 2: does the canonical host serve THIS site? ---- */
const c = await get(`${canonicalOrigin}/`);
if (!c.ok) {
  problems.push(`the canonical host does not answer at all — ${c.error}`);
} else {
  const hit = MARKERS.filter((m) => c.body.includes(m));
  const parked = /window\.location\.href\s*=\s*["']\/lander/.test(c.body)
    || (c.body.length < 600 && /window\.location/.test(c.body));

  console.log(`  canonical host   : HTTP ${c.status}, ${c.body.length} bytes`);

  if (parked) {
    problems.push(
      `the canonical host is a PARKED DOMAIN — it answers ${c.status} with a ` +
      `${c.body.length}-byte redirect stub, not this site. Every page is ` +
      `telling search engines its real home is a parking page.`,
    );
  } else if (hit.length === 0) {
    problems.push(
      `the canonical host answers ${c.status} but serves something that is NOT ` +
      `this site — none of ${JSON.stringify(MARKERS)} appear in it.`,
    );
  } else {
    console.log(`  serves this site : yes (${hit.join(", ")})`);
  }
}

/* ---- 3: the apex ---- */
if (apexHost !== host) {
  const a = await get(apexOrigin, { redirect: "manual" });
  if (!a.ok) {
    problems.push(`the apex ${apexOrigin} does not answer — ${a.error}`);
  } else if (a.status >= 300 && a.status < 400) {
    console.log(`  apex             : ${a.status} redirect (correct)`);
  } else if (a.status === 200) {
    notes.push(`${apexOrigin} answers 200 directly. Serving the same site on two hosts splits ranking signals — prefer a redirect to one of them.`);
  } else {
    problems.push(
      `the apex ${apexOrigin} returns ${a.status}. Most people type the domain ` +
      `WITHOUT www, so most people are getting an error page.`,
    );
  }
}

for (const n of notes) console.log(`\n  NOTE: ${n}`);

if (problems.length) {
  console.error(`\n  CANONICAL CHECK FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`   ✗ ${p}\n`);
  console.error(
    `  This is configuration, not code: NEXT_PUBLIC_SITE_URL is set in the\n` +
    `  hosting environment. Either point the domain at this deployment, or set\n` +
    `  NEXT_PUBLIC_SITE_URL to a host that actually serves it. Until then the\n` +
    `  site is disclaiming itself on every page.\n`,
  );
  process.exit(1);
}

console.log(`\n  CANONICAL CHECK PASSED — the declared home serves this site.\n`);
