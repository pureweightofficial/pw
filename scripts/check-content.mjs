/**
 * CONTENT GATE — the compiler the JSON doesn't have.
 *
 * The keeper panel at /keeper edits src/content/*.json. JSON is untyped at
 * rest, and the site's core guarantee — nothing unverified renders as fact —
 * used to be enforced by TypeScript's shape checking on a literal in
 * site.ts. That literal is now data, so the enforcement moves here, and it
 * runs FIRST in `npm run verify`, which CI runs before the export. A
 * malformed edit fails the build; it does not ship.
 *
 * This gate deliberately checks MORE than the adapter tolerates. The adapter
 * in site.ts degrades gracefully (a bad value renders as the placeholder);
 * the gate is loud about the same condition, because "the owner typed a
 * phone number and the site silently shows a placeholder" is a support
 * mystery, whereas "the build told them the phone number looks wrong" is a
 * correction.
 *
 * THE FORBIDDEN-PHRASE SCAN IS THE PART THAT MATTERS MOST. The credential
 * fields are individually gated (insurance requires its issuer, the review
 * score requires its source), but prose fields would otherwise be an open
 * side door: type "fully insured, best prices guaranteed" into the founder
 * message and every gate is bypassed. The scan closes the door: credentials
 * and promises may only enter through the fields that demand their evidence.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const business = read("src/content/business.json");
const services = read("src/content/services.json");
const testimonials = read("src/content/testimonials.json");

/*
  The schema lives in src/lib/content-schema.ts. This script is plain node —
  it must not need a TS toolchain — so the few rules it enforces are restated
  here. A drift test at the bottom keeps the two files honest with each other:
  if a key exists in one place and not the other, the gate fails.
*/
const BUSINESS_KEYS = [
  "legalName", "registrationNumber", "vatNumber", "yearEstablished",
  "address", "serviceArea", "telephone", "email", "openingHours",
  "appointmentProcess", "settlementMethods", "priceReferenceSource",
  "insurance", "insuranceIssuer", "memberships", "certifications",
  "licences", "securityProcedures", "weighingEquipment", "reviewScore",
  "reviewScoreSource", "founderMessage", "foundingStory", "social",
];

const PATTERNS = {
  telephone: [/^[+()0-9 \-.]{7,}$/, "should be a real phone number (digits and separators, at least 7)"],
  email: [/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/, "should be a valid email address"],
  yearEstablished: [/^(19|20)\d{2}$/, "should be a four-digit year like 1998"],
  registrationNumber: [/^[A-Za-z0-9 \-/]{4,}$/, "should be at least 4 letters or digits"],
  vatNumber: [/^[A-Za-z0-9 \-]{4,}$/, "should be at least 4 letters or digits"],
  address: [/^.{10,}$/, "should be a full street address"],
};

const REQUIRES = {
  insurance: ["insuranceIssuer"],
  reviewScore: ["reviewScoreSource"],
};

const FORBIDDEN = [
  [/same[ -]day/i, "a turnaround promise nobody has verified"],
  [/\binstant(ly)?\b/i, "a speed promise nobody has verified"],
  [/guarantee[ds]?\b/i, "a guarantee is a legal commitment"],
  [/(best|highest|top) (price|rate|value)/i, "an unverifiable market claim"],
  [/no (fee|charge|cost)s?\b/i, "a pricing promise nobody has verified"],
  [/free valuation/i, "a pricing promise nobody has verified"],
  [/within \d+ ?(minute|hour|day)s?/i, "a turnaround promise nobody has verified"],
  [/\d+ ?%/, "percentages read as offers or rates"],
  [/\b(licen[cs]ed|certified|insured|accredited|regulated|registered with)\b/i,
    "credentials may only be claimed through their own evidence-gated field"],
];

const SERVICE_IDS = ["jewellery", "silver", "coins", "bullion"];

const failures = [];
const fail = (msg) => failures.push(msg);
const s = (v) => (typeof v === "string" ? v.trim() : "");

/* ------------------------------------------------------------------ */
/* business.json                                                      */
/* ------------------------------------------------------------------ */

for (const key of Object.keys(business)) {
  if (!BUSINESS_KEYS.includes(key)) {
    fail(`business.json has an unknown field "${key}" — the panel and the site have drifted apart`);
  }
}
for (const key of BUSINESS_KEYS) {
  if (!(key in business)) {
    fail(`business.json is missing the field "${key}"`);
  }
}

for (const [key, value] of Object.entries(business)) {
  const text = Array.isArray(value) ? value.join(" ") : s(value);
  if (text.includes("[INSERT")) {
    fail(`business.${key} contains a literal "[INSERT" placeholder — leave the field EMPTY instead; the site renders the placeholder for you`);
  }
  if (key in PATTERNS && s(value) !== "") {
    const [re, hint] = PATTERNS[key];
    if (!re.test(s(value))) fail(`business.${key} ${hint} (got: "${s(value)}")`);
  }
}

for (const [key, companions] of Object.entries(REQUIRES)) {
  if (s(business[key]) !== "") {
    for (const companion of companions) {
      if (s(business[companion]) === "") {
        fail(`business.${key} is filled in but business.${companion} is empty — a credential must name its issuer/source, or it stays a placeholder`);
      }
    }
  }
}

if (Array.isArray(business.social)) {
  for (const url of business.social) {
    if (s(url) !== "" && !/^https:\/\//.test(s(url))) {
      fail(`business.social entry "${url}" must be a full https:// URL`);
    }
  }
}

/* Prose scan: every owner-editable free-text field in business.json. */
const BUSINESS_PROSE = [
  "serviceArea", "appointmentProcess", "settlementMethods",
  "securityProcedures", "weighingEquipment", "founderMessage", "foundingStory",
];
for (const key of BUSINESS_PROSE) {
  const text = s(business[key]);
  if (text === "") continue;
  for (const [re, why] of FORBIDDEN) {
    const m = text.match(re);
    if (m) fail(`business.${key} contains "${m[0]}" — ${why}. Remove the phrase; if it is a real credential, it belongs in its own field with its evidence.`);
  }
}

/* ------------------------------------------------------------------ */
/* services.json                                                      */
/* ------------------------------------------------------------------ */

for (const id of Object.keys(services)) {
  if (!SERVICE_IDS.includes(id)) fail(`services.json has an unknown panel "${id}" — panels cannot be added from content`);
}
for (const id of SERVICE_IDS) {
  const svc = services[id];
  if (!svc) { fail(`services.json is missing the "${id}" panel`); continue; }
  if (s(svc.summary) === "") fail(`services.${id}.summary is empty`);
  if (s(svc.body) === "") fail(`services.${id}.body is empty`);
  if (!Array.isArray(svc.points) || svc.points.length < 1) {
    fail(`services.${id}.points needs at least one entry`);
  } else {
    for (const p of svc.points) if (s(p) === "") fail(`services.${id}.points contains an empty entry`);
  }
  if (s(svc.image) !== "") {
    if (!/^\/img\//.test(s(svc.image))) {
      fail(`services.${id}.image must start with /img/ (repo-relative; the site adds /pw itself — writing /pw here would double the prefix)`);
    }
    if (s(svc.imageAlt) === "") {
      fail(`services.${id}.image is set but imageAlt is empty — every image needs a description, this is what screen readers and image search read`);
    }
  }
  for (const field of ["summary", "body"]) {
    for (const [re, why] of FORBIDDEN) {
      const m = s(svc[field]).match(re);
      if (m) fail(`services.${id}.${field} contains "${m[0]}" — ${why}`);
    }
  }
  if (Array.isArray(svc.points)) {
    for (const p of svc.points) {
      for (const [re, why] of FORBIDDEN) {
        const m = s(p).match(re);
        if (m) fail(`services.${id}.points contains "${m[0]}" — ${why}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* testimonials.json                                                  */
/* ------------------------------------------------------------------ */

if (!Array.isArray(testimonials.testimonials)) {
  fail("testimonials.json must contain a testimonials array");
} else {
  testimonials.testimonials.forEach((t, i) => {
    const n = i + 1;
    if (s(t.quote) === "") fail(`testimonial #${n} has no quote`);
    if (s(t.name) === "") fail(`testimonial #${n} has no customer name — an unattributed quote reads as invented`);
    if (s(t.context) === "") fail(`testimonial #${n} has no context (e.g. "Sold a gold chain, June 2026")`);
    if (s(t.photo) !== "" && !/^\/img\//.test(s(t.photo))) {
      fail(`testimonial #${n} photo must start with /img/ (repo-relative)`);
    }
    for (const [re, why] of FORBIDDEN) {
      const m = s(t.quote).match(re);
      if (m) fail(`testimonial #${n} contains "${m[0]}" — ${why}. Real customers may well say this, but the site cannot print promises the business has not verified, even quoted.`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* faq.json                                                           */
/* ------------------------------------------------------------------ */

const faq = read("src/content/faq.json");

if (!Array.isArray(faq.general) || faq.general.length < 1) {
  fail("faq.json must contain at least one general question — an empty FAQ page is worse than no FAQ page");
} else {
  faq.general.forEach((item, i) => {
    const n = i + 1;
    if (s(item.question) === "") fail(`FAQ #${n} has no question`);
    else if (!s(item.question).endsWith("?")) fail(`FAQ #${n} question should end with a question mark (got: "${s(item.question).slice(-30)}")`);
    if (s(item.answer) === "") fail(`FAQ #${n} has no answer`);
    for (const [re, why] of FORBIDDEN) {
      const m = s(item.answer).match(re);
      if (m) fail(`FAQ #${n} answer contains "${m[0]}" — ${why}. General FAQ answers are trade knowledge, not business promises.`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* copy.json                                                          */
/* ------------------------------------------------------------------ */

const copy = read("src/content/copy.json");

/* Mirrors COPY_SECTIONS / COPY_FIELDS in content-schema.ts (drift-checked
   below). pillars.lead is the one legitimately empty field. */
const COPY_KEYS = ["hero", "journey", "services", "assay", "pillars", "story", "finale"];
const COPY_FIELDS = ["eyebrow", "heading", "accent", "lead"];
const COPY_LEAD_OPTIONAL = ["pillars"];

for (const key of Object.keys(copy)) {
  if (!COPY_KEYS.includes(key)) fail(`copy.json has an unknown section "${key}" — sections cannot be added from content`);
}
for (const key of COPY_KEYS) {
  const section = copy[key];
  if (!section) { fail(`copy.json is missing the "${key}" section`); continue; }
  for (const field of COPY_FIELDS) {
    if (field === "lead" && COPY_LEAD_OPTIONAL.includes(key)) continue;
    if (s(section[field]) === "") {
      fail(`copy.${key}.${field} is empty — the site would silently fall back to the original line, which means the owner's edit vanished. Fill it or restore the original text.`);
    }
  }
  for (const field of COPY_FIELDS) {
    for (const [re, why] of FORBIDDEN) {
      const m = s(section[field]).match(re);
      if (m) fail(`copy.${key}.${field} contains "${m[0]}" — ${why}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* insights/*.json                                                    */
/* ------------------------------------------------------------------ */

let insightFiles = [];
try {
  insightFiles = readdirSync(join(root, "src/content/insights")).filter((f) => f.endsWith(".json"));
} catch { /* no articles yet — valid */ }

const seenSlugs = new Set();
for (const file of insightFiles) {
  const a = read(`src/content/insights/${file}`);
  const at = `insights/${file}`;
  if (s(a.title) === "") fail(`${at}: title is empty`);
  if (s(a.summary) === "") fail(`${at}: summary is empty — it is the page's meta description and the index card`);
  if (s(a.body) === "") fail(`${at}: body is empty`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s(a.slug))) {
    fail(`${at}: slug "${s(a.slug)}" must be lowercase letters, digits and hyphens — it becomes the URL`);
  }
  if (s(a.slug) !== file.replace(/\.json$/, "")) {
    fail(`${at}: slug "${s(a.slug)}" must match the filename — the Keeper names files from slugs, and a mismatch orphans the article`);
  }
  if (seenSlugs.has(s(a.slug))) fail(`${at}: duplicate slug "${s(a.slug)}"`);
  seenSlugs.add(s(a.slug));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s(a.date))) {
    fail(`${at}: date "${s(a.date)}" must be YYYY-MM-DD — it feeds the article's structured data`);
  }
  for (const field of ["title", "summary", "body"]) {
    for (const [re, why] of FORBIDDEN) {
      const m = s(a[field]).match(re);
      if (m) fail(`${at}: ${field} contains "${m[0]}" — ${why}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* drift check against content-schema.ts                              */
/* ------------------------------------------------------------------ */

const schemaSource = readFileSync(join(root, "src/lib/content-schema.ts"), "utf8");
for (const key of COPY_KEYS) {
  if (!schemaSource.includes(`${key}:`)) {
    fail(`copy section "${key}" is enforced here but missing from content-schema.ts COPY_SECTIONS — drifted`);
  }
}
for (const key of BUSINESS_KEYS) {
  if (key === "insuranceIssuer" || key === "reviewScoreSource") continue; // companions live in COMPANION_FIELDS
  if (!schemaSource.includes(`${key}:`)) {
    fail(`"${key}" is enforced here but missing from content-schema.ts — the two schema halves have drifted`);
  }
}

/* ------------------------------------------------------------------ */

if (failures.length > 0) {
  console.error(`\nCONTENT CHECK FAILED — ${failures.length} problem(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    "\nFix the content in the keeper panel (or src/content/) and save again." +
      "\nNothing has been published.\n",
  );
  process.exit(1);
}

console.log("  content check: all clear");
