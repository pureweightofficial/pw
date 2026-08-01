import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

/**
 * THE INSIGHTS ENGINE — a blog with no database and no server.
 *
 * Articles are JSON files in src/content/insights/, one per article, written
 * by the owner through the Keeper. This module is the single reader: it runs
 * at BUILD TIME only (fs imports make that structural — importing it into a
 * client component is a build error, which is the right failure mode), so
 * every article page ships as plain prerendered HTML with zero client-side
 * markdown machinery.
 *
 * WHY JSON AND NOT MARKDOWN FILES WITH FRONT MATTER: the Keeper edits content
 * over the GitHub API from a browser. JSON needs no front-matter parser on
 * either end, survives round-tripping byte-identically, and is the format
 * every other content file in this repo already uses. The markdown lives in
 * the `body` field.
 *
 * SECURITY: the body is neutralised before parsing — every `<` becomes
 * `&lt;`, so raw HTML in an article renders as text rather than as markup.
 * Markdown itself doesn't need `<` for anything this site wants, and the
 * alternative is shipping a sanitizer. The only author is the owner, but the
 * rule exists so that a pasted snippet from elsewhere cannot inject markup
 * by accident.
 */

export type Article = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  author: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
  /** Derived: words / 200, floored at 1. */
  readingMinutes: number;
};

const DIR = join(process.cwd(), "src", "content", "insights");

function parseArticle(filename: string): Article | null {
  try {
    const raw = JSON.parse(readFileSync(join(DIR, filename), "utf8"));
    const body = typeof raw.body === "string" ? raw.body : "";
    return {
      slug: String(raw.slug ?? filename.replace(/\.json$/, "")),
      title: String(raw.title ?? ""),
      date: String(raw.date ?? ""),
      author: String(raw.author ?? "Pureweight"),
      summary: String(raw.summary ?? ""),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      draft: Boolean(raw.draft),
      body,
      readingMinutes: Math.max(1, Math.round(body.split(/\s+/).length / 200)),
    };
  } catch {
    // A malformed file must not take the whole site build down — the content
    // gate reports it loudly; the pages simply skip it.
    return null;
  }
}

/**
 * Published articles, newest first. Two filters, both load-bearing:
 *
 * DRAFTS are invisible everywhere — pages, index, sitemap all read this one
 * function, so they cannot disagree.
 *
 * FUTURE-DATED articles are invisible until their date arrives. This is how a
 * static site gets SCHEDULED PUBLISHING with no server: the build only
 * includes articles dated today or earlier, and pages.yml rebuilds on a daily
 * cron — so an article dated next Tuesday simply appears in Tuesday morning's
 * build. The owner writes it, dates it, unticks draft, and the calendar does
 * the rest. Comparison is by UTC date string, same shape both sides, so there
 * is no timezone arithmetic to get wrong.
 */
export function publishedArticles(): Article[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return []; // no directory yet — a site with no articles is a valid site
  }
  const today = new Date().toISOString().slice(0, 10);
  return files
    .map(parseArticle)
    .filter(
      (a): a is Article =>
        a !== null && !a.draft && a.title !== "" && a.date <= today,
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function articleBySlug(slug: string): Article | null {
  return publishedArticles().find((a) => a.slug === slug) ?? null;
}

/** Markdown -> HTML, with raw HTML neutralised. Build-time only. */
export function renderBody(body: string): string {
  const safe = body.replace(/</g, "&lt;");
  return marked.parse(safe, { async: false }) as string;
}
