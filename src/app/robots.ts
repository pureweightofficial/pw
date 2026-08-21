import type { MetadataRoute } from 'next';
import { allowIndexing, brand } from '@/lib/site';

// Required by `output: 'export'`, harmless on a server build — this route has
// no request-time dependencies, so it is generated once at build.
export const dynamic = 'force-static';


export default function robots(): MetadataRoute.Robots {
  const base = brand.url.replace(/\/$/, '');

  // Staging and preview deployments refuse everything. See `allowIndexing`.
  if (!allowIndexing) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /**
         * ONLY the API and the keeper are blocked here.
         *
         * The unwritten legal shells and the insights index are excluded from
         * search by a `noindex` robots meta tag instead — deliberately, because
         * blocking them in robots.txt would be self-defeating: a crawler that
         * is not allowed to fetch the page never sees the noindex on it, and
         * the URL can still surface in results as a bare, untitled link.
         *
         * Disallow blocks crawling. Noindex blocks indexing. Wanting the second
         * means permitting the first.
         *
         * The keeper (the owner's admin panel at /keeper/) gets BOTH: it is a
         * static file whose HTML carries its own noindex meta, and there is
         * nothing on it worth a crawler's time under any circumstances — it
         * is a login screen. The usual trade-off above is about pages whose
         * absence from results matters more than their contents; this one has
         * no contents.
         */
        /*
          BOTH SPELLINGS OF THE KEEPER, and that is not belt-and-braces.

          robots.txt matches on a literal path prefix, so '/keeper/' matches
          '/keeper/anything' and does NOT match '/keeper' — which is exactly
          the URL the production host serves, because the Vercel build has no
          trailing slash. The rule was a no-op on the only deployment that
          matters, while reading as though the admin panel were covered.

          '/api/' is kept although no API routes exist today: it costs one
          line and it means a future route is disallowed by default rather
          than by remembering.
        */
        disallow: ['/api/', '/keeper', '/keeper/'],
        /*
          NO SEPARATE GROUPS FOR AI CRAWLERS, AND THAT IS A DECISION.

          GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended and the rest
          are ALLOWED — they match the `*` group above, which permits
          everything except the two paths listed. That is the right answer for
          this business: a local gold buyer's content exists to make somebody
          drive to Gainesville, not to earn its living from being read here. An
          assistant that answers "who buys gold near Gainesville" with this
          shop's name has done the marketing for free. Blocking them costs
          visibility in the surface where local intent is growing fastest and
          protects nothing.

          Writing that out as explicit `User-agent: GPTBot / Allow: /` groups
          would be actively DANGEROUS, which is why it is recorded here instead
          of in the file. robots.txt matching is winner-takes-all: a crawler
          that finds a group naming it specifically obeys ONLY that group and
          ignores `*` entirely. So an explicit allow-group for GPTBot would
          silently drop the /keeper disallows for GPTBot — the admin panel
          becomes crawlable by exactly the agents someone added the group to
          be careful about. Every disallow would have to be repeated in every
          group, forever, correctly.

          If a future owner wants to block AI crawlers, the change is a new
          group per agent that repeats these disallows AND adds `Disallow: /`.
          Do not do it by deleting this comment.
        */
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
