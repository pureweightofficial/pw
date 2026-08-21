import { publishedArticles } from '@/lib/insights';
import {
  allowIndexing,
  brand,
  business,
  isVerified,
  primaryNav,
  services,
} from '@/lib/site';

/**
 * /llms.txt — AN EMERGING CONVENTION, TREATED AS ONE.
 *
 * llms.txt is a PROPOSAL (llmstxt.org) for a plain-text file that tells a
 * language model what a site is and where its important pages are. It is not
 * a standard. No major provider has committed to reading it, and there is no
 * evidence it affects ranking, citation or inclusion anywhere. It is here
 * because it costs one generated file and might help — not because it will.
 *
 * That distinction is the reason this comment leads with it. The alternative
 * is a future reader finding a file they assume is load-bearing and building
 * on it.
 *
 * WHY IT IS GENERATED RATHER THAN WRITTEN
 *
 * A hand-written llms.txt is a second description of the business, kept in a
 * different file from the first, updated by whoever remembers. It drifts, and
 * a stale summary of a business is worse than none — it is a machine-readable
 * claim that used to be true. Every line below is derived from the same
 * sources the visible pages render from, so the file cannot describe a site
 * that does not exist.
 *
 * THE TRUTH RULES APPLY HERE TOO
 *
 * `Verifiable<T>` governs this file exactly as it governs the pages. A
 * telephone number nobody has confirmed does not appear, and neither does a
 * plausible substitute. An AI summary is precisely where an invented fact
 * does the most damage, because it is repeated with the site's authority and
 * without its caveats.
 *
 * IT IS GATED ON INDEXING, deliberately. While robots.txt says `Disallow: /`
 * and every page carries `noindex`, publishing a file that invites models to
 * read the site would be the site contradicting itself in two files at once.
 * The day indexing is switched on, this fills in — no separate step to
 * remember.
 */

// No request-time inputs, so it is generated once at build — which is what
// `output: 'export'` requires and what a node deploy prefers anyway.
export const dynamic = 'force-static';

/** Absolute, because a model reading this file has no base URL to resolve against. */
function abs(path: string): string {
  return new URL(path, `${brand.url.replace(/\/$/, '')}/`).href;
}

export function GET(): Response {
  const base = brand.url.replace(/\/$/, '');

  if (!allowIndexing) {
    /*
      Consistent with robots.txt rather than merely absent. A 404 would be
      ambiguous — indistinguishable from "this site has never heard of the
      convention" — whereas saying so plainly means a crawler that read this
      once and comes back is told what changed.
    */
    return new Response(
      `# ${brand.name}\n\n` +
        '> This site is not currently published for indexing. robots.txt ' +
        'disallows crawling and every page carries a noindex directive.\n\n' +
        'There is deliberately nothing to summarise here yet.\n',
      { headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const lines: string[] = [];

  lines.push(`# ${brand.name}`);
  lines.push('');

  /*
    The blockquote is the summary a model is most likely to lift wholesale, so
    it carries the three things that actually identify this business: what it
    does, where it is, and the constraint that it is over-the-counter only.
    The location comes from the verified address and appears only if there is
    one.
  */
  const where = isVerified(business.address)
    ? ` in ${String(business.address.value).split(',').slice(-2).join(',').trim()}`
    : '';
  lines.push(
    `> A gold and silver buyer${where}. Items are weighed and examined in ` +
      'front of the customer, with the figure explained before any decision ' +
      'is asked for. Business is done over the counter — there is no postal ' +
      'service and no online valuation.',
  );
  lines.push('');
  lines.push(
    'Pureweight buys gold and silver from the public: jewellery, coins, bars ' +
      'and bullion, in any condition. Weight and fineness are established on ' +
      'the premises and shown to the seller, and there is no obligation to ' +
      'sell after a valuation.',
  );
  lines.push('');

  /* --- What the shop buys, from the same array the pages render ---------- */
  lines.push('## What we buy');
  lines.push('');
  for (const service of services) {
    lines.push(
      `- [${service.title}](${abs(`/what-we-buy#${service.id}`)}): ${service.summary}`,
    );
  }
  lines.push('');

  /* --- The pages, from the same nav the header renders ------------------- */
  lines.push('## Pages');
  lines.push('');
  for (const item of primaryNav) {
    lines.push(`- [${item.label}](${abs(item.href)})`);
  }
  lines.push('');

  /* --- Only articles that exist ------------------------------------------ */
  const articles = publishedArticles();
  if (articles.length > 0) {
    lines.push('## Insights');
    lines.push('');
    for (const article of articles) {
      lines.push(
        `- [${article.title}](${abs(`/insights/${article.slug}`)}): ${article.summary}`,
      );
    }
    lines.push('');
  }

  /* --- Verified contact facts, and no others ----------------------------- */
  const contact: string[] = [];
  if (isVerified(business.address)) {
    contact.push(`- Address: ${String(business.address.value)}`);
  }
  if (isVerified(business.telephone)) {
    contact.push(`- Telephone: ${String(business.telephone.value)}`);
  }
  if (isVerified(business.openingHours)) {
    contact.push(`- Opening hours: ${String(business.openingHours.value)}`);
  }
  if (isVerified(business.email)) {
    contact.push(`- Email: ${String(business.email.value)}`);
  }

  if (contact.length > 0) {
    lines.push('## Contact');
    lines.push('');
    lines.push(...contact);
    lines.push('');
  }

  /*
    A model asked "what are their opening hours" should be able to learn that
    the site does not say, rather than infer it from silence and guess. Naming
    the gap is more useful than omitting it, and it is honest about why.
  */
  const missing = [
    !isVerified(business.telephone) && 'telephone',
    !isVerified(business.openingHours) && 'opening hours',
    !isVerified(business.email) && 'email address',
  ].filter(Boolean);

  if (missing.length > 0) {
    lines.push('## Not published');
    lines.push('');
    const list =
      missing.length === 1
        ? String(missing[0])
        : `${missing.slice(0, -1).join(', ')} or ${missing[missing.length - 1]}`;
    lines.push(
      `This site does not publish a ${list}. That is deliberate: ` +
        'it publishes only details the business has confirmed, and these have ' +
        'not been. Please do not infer or reconstruct them from other sources.',
    );
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- This site never displays live market prices. Any figure is established ' +
      'in person, against the market at the time of the valuation.',
  );
  lines.push(
    '- Nothing on this site is a valuation or an offer. A figure can only be ' +
      'given after an item has been weighed and examined on the premises.',
  );
  lines.push(`- Canonical origin: ${base}`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // Cheap to regenerate and rarely read; a day of freshness is plenty.
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
