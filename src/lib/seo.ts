import type { Metadata } from "next";
import seoContent from "@/content/seo.json";
import { composeTitle } from "@/lib/content-schema";
import { brand, canonicalPath, ogFor } from "@/lib/site";

/**
 * PER-PAGE SEO, OWNER-EDITABLE.
 *
 * Every page's title and meta description now come from src/content/seo.json,
 * edited in the Keeper's SEO tab. One helper builds the whole Metadata block
 * so the three things that must agree — title, description and the OpenGraph
 * card — cannot drift apart by being written out three times per page.
 *
 * That drift was a real hazard here, not a hypothetical: Next replaces the
 * `openGraph` object wholesale rather than deep-merging, so a page that
 * updated its title but forgot its OG title would ship a social card
 * advertising the old one. Now there is one source per page and one helper.
 *
 * FALLBACKS, as everywhere in this codebase: an empty or missing entry falls
 * back to the page's original copy. A blanked field cannot produce a titleless
 * page — the worst an editing accident does is restore what was there before.
 * The Keeper refuses empties anyway; this is the second wall.
 */

export type PageKey = keyof typeof seoContent;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Reads the owner's values with the original copy as the safety net. */
export function seoFor(
  key: PageKey,
  defaults: { title: string; description: string },
): { title: string; description: string } {
  const raw = (seoContent[key] ?? {}) as { title?: string; description?: string };
  return {
    title: s(raw.title) || defaults.title,
    description: s(raw.description) || defaults.description,
  };
}

/**
 * The whole Metadata block for a page, from one source.
 *
 * `path` is the site-relative route ("/faq"); canonicalPath adds the trailing
 * slash the Pages target redirects to, so canonicals and the sitemap agree
 * rather than pointing at URLs that 301.
 *
 * `title.absolute` deliberately bypasses the root layout's title template.
 * With the template in play two rules were appending the business name — the
 * template for the browser tab and this helper for the OpenGraph card — which
 * is how the homepage shipped the name twice in <title> but once in og:title.
 * composeTitle is now the only rule, and both read the same string from it.
 */
export function pageMetadata(
  key: PageKey,
  path: string,
  defaults: { title: string; description: string },
  extra?: Metadata,
): Metadata {
  const { title, description } = seoFor(key, defaults);
  /*
    The FULL business name, matching og:site_name. It costs 27 of the ~60
    characters a search result shows, which puts several pages over the soft
    limit — but shortening the name, or rewriting the owner's titles to fit,
    is a branding decision that belongs to the owner and not to this helper.
    The panel now measures the composed string honestly and says so; what to
    do about a long title is his call to make in the SEO tab.
  */
  const full = composeTitle(title, brand.name);
  return {
    title: { absolute: full },
    description,
    alternates: { canonical: canonicalPath(path) },
    openGraph: ogFor({ title: full, description, path }),
    ...extra,
  };
}
