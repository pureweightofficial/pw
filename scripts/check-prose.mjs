/**
 * WHAT DOES THE VISITOR ACTUALLY READ?
 *
 * Every other content gate in this repo inspects a SOURCE: check-content.mjs
 * validates src/content/*.json, the Verifiable<T> type stops invented facts at
 * compile time, and check-contrast measures tokens. None of them read the
 * finished page.
 *
 * WHY THAT GAP MATTERED. When the hide-until-verified change retired the
 * visible "[INSERT ...]" placeholder chips, several sections were still
 * describing those chips to the reader in their own body copy. The trust
 * section's lead said:
 *
 *     "Anything below that is not filled in has not been verified, and is
 *      shown as an open slot rather than filled with something plausible."
 *
 * There were no open slots. For a release, the one section on the site whose
 * entire subject is whether it can be believed was pointing at a UI that had
 * been deleted. Every gate passed, because the sentence is well-formed English
 * living in JSX — and check-content.mjs only reads the JSON. That was verified
 * rather than assumed: the bad sentence was reintroduced deliberately and
 * check-content still reported "all clear".
 *
 * So this gate reads the BUILT HTML, strips it to the text a person sees, and
 * looks for prose that describes machinery the site no longer has. It catches
 * such copy wherever it lives — JSX, JSON, a future MDX file — because by the
 * time it gets here, provenance no longer matters.
 *
 * Run after a build:  npm run check:prose
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

if (!existsSync(out)) {
  console.error("  out/ does not exist. Build first: GITHUB_PAGES=true npm run build");
  process.exit(1);
}

/*
  These describe RETIRED MACHINERY, not forbidden claims. The marketing-claim
  patterns (guarantees, "best price", percentages) live in
  src/lib/content-schema.ts and are enforced against the Keeper's JSON at the
  point of editing, which is the right place for them — an owner typing a
  promise should be stopped while typing it.

  This list is the other half: language that was true about the interface once
  and silently stopped being true. It belongs at the rendered layer, because
  the failure mode is drift between what the page DOES and what it SAYS it
  does, and only the finished page knows both.
*/
const RETIRED_UI_LANGUAGE = [
  {
    pattern: /(open|empty|visible|blank) slots?\b/i,
    why: 'the "[INSERT ...]" placeholder slots were retired; unverified facts are absent now, so copy must not point a reader at them',
  },
  {
    pattern: /shown as (an? )?(open|empty|visible|blank)\b/i,
    why: "describes the retired placeholder rendering",
  },
  {
    pattern: /\b(has |have )?not (yet )?been verified\b/i,
    why: "unverified facts are withheld silently; annotating their absence in prose re-creates the gap-advertising the policy removed",
  },
  {
    pattern: /\barticle pending\b/i,
    why: "the pending-article cards were retired with the placeholder chips",
  },
  {
    pattern: /\[INSERT\b/i,
    why: "a raw placeholder token reached the rendered page",
  },
  {
    pattern: /\bawaiting (client|owner) confirmation\b/i,
    why: "an internal editorial state leaked into visitor-facing copy",
  },
];

/** Every built page, so a subpage cannot drift while the homepage stays clean. */
function htmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

/**
 * HTML to the text a person reads.
 *
 * Script and style contents are removed FIRST and entirely. Next embeds the
 * whole RSC payload in a <script>, which contains every string on the page
 * including ones that are never displayed — matching against that would report
 * copy nobody can see and, worse, would keep reporting it after the visible
 * text was fixed.
 */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const failures = [];
const pages = htmlFiles(out);

for (const file of pages) {
  const text = visibleText(readFileSync(file, "utf8"));
  for (const rule of RETIRED_UI_LANGUAGE) {
    const hit = rule.pattern.exec(text);
    if (!hit) continue;
    const at = hit.index;
    const context = text.slice(Math.max(0, at - 80), at + 120).trim();
    failures.push({
      page: relative(out, file).replace(/\\/g, "/"),
      phrase: hit[0],
      why: rule.why,
      context,
    });
  }
}

console.log(`  scanned ${pages.length} built page(s)`);

if (failures.length) {
  console.error(`\nPROSE CHECK FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) {
    console.error(`  ✗ ${f.page}`);
    console.error(`      phrase: "${f.phrase}"`);
    console.error(`      why:    ${f.why}`);
    console.error(`      near:   ...${f.context}...\n`);
  }
  process.exit(1);
}

console.log("  prose check: no copy describes retired interface machinery");
