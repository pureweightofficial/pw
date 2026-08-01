import type { Metadata } from "next";
import seoContent from "@/content/seo.json";
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
 */
export function pageMetadata(
  key: PageKey,
  path: string,
  defaults: { title: string; description: string },
  extra?: Metadata,
): Metadata {
  const { title, description } = seoFor(key, defaults);
  return {
    title,
    description,
    alternates: { canonical: canonicalPath(path) },
    openGraph: ogFor({
      // The homepage's title already carries the brand; subpages get it
      // appended so a shared card reads as this business's page either way.
      title: key === "home" ? title : `${title} — ${brand.name}`,
      description,
      path,
    }),
    ...extra,
  };
}
