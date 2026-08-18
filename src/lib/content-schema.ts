/**
 * CONTENT SCHEMA — the single table that makes the keeper panel safe.
 *
 * The admin panel at /keeper edits plain JSON in src/content/. JSON has no
 * types and no compiler, so everything that used to be guaranteed by
 * TypeScript's shape-checking has to be guaranteed by THIS table instead. It
 * is read in two places:
 *
 *   src/lib/site.ts            derives Verifiable<T> from the JSON at build
 *                              time — a field is a fact only if this table
 *                              says its value qualifies
 *   scripts/check-content.mjs  fails the CI build when the JSON breaks any
 *                              rule here, BEFORE the site is exported
 *
 * THE CENTRAL DECISION: the panel never sees the word "verified".
 *
 * The owner is not given a switch that promotes a value to fact status.
 * A field FILLED IN is a fact; a field LEFT BLANK renders as the visible
 * placeholder, exactly as before. Deriving status from content removes the
 * only control that could have been misused, which is stronger than guarding
 * it. The `[INSERT …]` labels live here, in code the panel does not expose.
 *
 * CREDENTIALS CANNOT STAND ALONE. `insurance` without the insurer named, or a
 * review score without a public source, stays a placeholder no matter what is
 * typed into the main field. A credential that cannot say who issued it is
 * not a credential — it is the kind of vague claim this site exists to never
 * make.
 */

export type ContentRule = {
  /** Shown in the panel and in gate failure messages. */
  label: string;
  /** Rendered on the site while the field is empty. Never editable in the panel. */
  placeholder: string;
  /** Regex source the value must match to count as a fact. */
  pattern?: string;
  /** Human sentence for the gate's failure message when the pattern misses. */
  patternHint?: string;
  /** Companion fields that must ALSO be non-empty before this one is a fact. */
  requires?: readonly string[];
};

export const BUSINESS_RULES = {
  legalName: {
    label: "Registered legal name",
    placeholder: "[INSERT REGISTERED LEGAL NAME]",
  },
  registrationNumber: {
    label: "Business registration number",
    placeholder: "[INSERT VERIFIED BUSINESS REGISTRATION NUMBER]",
    pattern: "^[A-Za-z0-9 \\-/]{4,}$",
    patternHint: "at least 4 letters or digits",
  },
  vatNumber: {
    label: "VAT / tax number",
    placeholder: "[INSERT VAT / TAX NUMBER, IF APPLICABLE]",
    pattern: "^[A-Za-z0-9 \\-]{4,}$",
    patternHint: "at least 4 letters or digits",
  },
  yearEstablished: {
    label: "Year established",
    placeholder: "[INSERT CONFIRMED YEAR ESTABLISHED]",
    pattern: "^(19|20)\\d{2}$",
    patternHint: "a four-digit year like 1998",
  },
  address: {
    label: "Trading address",
    placeholder: "[INSERT CONFIRMED TRADING ADDRESS]",
    pattern: "^.{10,}$",
    patternHint: "a full street address",
  },
  serviceArea: {
    label: "Service area",
    placeholder: "[INSERT CONFIRMED SERVICE AREA]",
  },
  telephone: {
    label: "Telephone",
    placeholder: "[INSERT VERIFIED TELEPHONE NUMBER]",
    pattern: "^[+()0-9 \\-.]{7,}$",
    patternHint: "a real phone number, digits and separators only",
  },
  email: {
    label: "Enquiry email",
    placeholder: "[INSERT VERIFIED ENQUIRY EMAIL ADDRESS]",
    pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$",
    patternHint: "a valid email address",
  },
  openingHours: {
    label: "Opening hours",
    placeholder: "[INSERT CONFIRMED OPENING HOURS]",
  },
  appointmentProcess: {
    label: "Appointment process",
    placeholder: "[INSERT VERIFIED APPOINTMENT PROCESS]",
  },
  settlementMethods: {
    label: "Settlement / payment methods",
    placeholder: "[INSERT CONFIRMED SETTLEMENT / PAYMENT METHODS]",
  },
  priceReferenceSource: {
    label: "Gold-price reference source",
    placeholder: "[INSERT APPROVED GOLD-PRICE REFERENCE SOURCE]",
  },
  insurance: {
    label: "Insurance",
    placeholder: "[INSERT VERIFIED INSURANCE DETAILS]",
    requires: ["insuranceIssuer"],
  },
  memberships: {
    label: "Professional memberships",
    placeholder: "[INSERT VERIFIED PROFESSIONAL MEMBERSHIPS]",
  },
  certifications: {
    label: "Certifications",
    placeholder: "[INSERT VERIFIED CERTIFICATIONS]",
  },
  licences: {
    label: "Licences",
    placeholder: "[INSERT VERIFIED LICENCES]",
  },
  securityProcedures: {
    label: "Security procedures",
    placeholder: "[INSERT CONFIRMED SECURITY PROCEDURES]",
  },
  weighingEquipment: {
    label: "Weighing / assay equipment",
    placeholder: "[INSERT CONFIRMED WEIGHING / ASSAY EQUIPMENT]",
  },
  reviewScore: {
    label: "Customer review score",
    placeholder: "[INSERT GENUINE AGGREGATE REVIEW SCORE + SOURCE]",
    requires: ["reviewScoreSource"],
  },
  founderMessage: {
    label: "Founder message",
    placeholder: "[INSERT FOUNDER MESSAGE]",
  },
  foundingStory: {
    label: "Founding story",
    placeholder: "[INSERT VERIFIED FOUNDING STORY]",
  },
  social: {
    label: "Social channels",
    placeholder: "[INSERT CONFIRMED SOCIAL CHANNELS]",
  },
} as const satisfies Record<string, ContentRule>;

/**
 * Companion fields: exist only to qualify a credential, never rendered alone,
 * and deliberately absent from BUSINESS_RULES so they can never be mistaken
 * for facts in their own right.
 */
export const COMPANION_FIELDS = ["insuranceIssuer", "reviewScoreSource"] as const;

/** The only service ids the panel may address. Panels cannot be added or removed. */
export const SERVICE_IDS = ["jewellery", "silver", "coins", "bullion"] as const;

/**
 * SITE COPY SECTIONS — the hero and chapter openers editable in the Keeper.
 *
 * `leadRequired: false` exists for exactly one section: pillars has no lead
 * paragraph by design, and requiring one would force the owner to invent
 * text. Everywhere else an empty field falls back to the original line at
 * render (src/lib/copy.ts), so the site cannot be blanked — but the panel
 * still refuses empties so the fallback never becomes the content.
 */
export const COPY_SECTIONS = {
  hero: { label: "Homepage hero", leadRequired: true },
  journey: { label: "How It Works opener", leadRequired: true },
  services: { label: "What We Buy opener", leadRequired: true },
  assay: { label: "Purity & Weight opener", leadRequired: true },
  pillars: { label: "Built on Trust opener", leadRequired: false },
  story: { label: "About opener", leadRequired: true },
  finale: { label: "Closing statement", leadRequired: true },
} as const;

/**
 * PAGES WHOSE TITLE AND DESCRIPTION THE OWNER CONTROLS.
 *
 * Article pages are absent on purpose: their title and summary ARE their SEO
 * fields, edited in the Insights tab. Duplicating them here would create two
 * places to change one sentence.
 */
export const SEO_PAGES = {
  home: { label: "Homepage", path: "/" },
  "what-we-buy": { label: "What We Buy", path: "/what-we-buy" },
  "how-it-works": { label: "How It Works", path: "/how-it-works" },
  "purity-and-weight": { label: "Purity & Weight", path: "/purity-and-weight" },
  about: { label: "About", path: "/about" },
  faq: { label: "FAQ", path: "/faq" },
  contact: { label: "Contact", path: "/contact" },
  insights: { label: "Insights index", path: "/insights" },
} as const;

/**
 * Soft limits, not hard ones. Google truncates around these lengths but the
 * exact point depends on pixel width, so the panel warns and never blocks —
 * a long title is a judgement call, not an error.
 *
 * These count the COMPOSED title (see composeTitle), not what the owner typed.
 * Counting the typed string would have understated every page by the length of
 * the business name — a 58-character title reading "58 / 60, fine" while 85
 * characters shipped and Google cut the end off.
 */
export const SEO_TITLE_SOFT_MAX = 60;
export const SEO_DESCRIPTION_SOFT_MAX = 160;

/**
 * THE TITLE THAT ACTUALLY SHIPS.
 *
 * A search result should name the business, but making the owner retype
 * "— Pureweight Gold Exchange" on all eight pages is how a page ends up
 * missing it. So the name is appended when it is absent and left alone when
 * it is already there.
 *
 * That second clause is not politeness — it is a bug fix. Next's title
 * template appended the name unconditionally, and the homepage entry already
 * opened with it, so the live homepage shipped
 * "Pureweight Gold Exchange — We Buy Gold… — Pureweight Gold Exchange".
 * Composing the final string here, once, and rendering it with `absolute`
 * means one rule decides, and the panel can show the owner the same string
 * the page will emit.
 */
export function composeTitle(title: string, brandName: string): string {
  const t = title.trim();
  if (t === "") return brandName;
  return t.toLowerCase().includes(brandName.toLowerCase())
    ? t
    : `${t} — ${brandName}`;
}

export const COPY_FIELDS = ["eyebrow", "heading", "accent", "lead"] as const;

/**
 * The hero headline renders at 5.5vw in a capitals-heavy display face; past
 * roughly this many characters it wraps to a second line on a 1440 laptop —
 * measured when the original headline was set. A soft warning in the panel,
 * not a hard stop: some wraps are intended.
 */
export const HERO_HEADING_SOFT_MAX = 24;

/**
 * OPENING HOURS, STRUCTURED.
 *
 * `openingHours` was a single free-text field, which was honest but inert: a
 * search engine cannot read "Mon-Fri 9-5, closed Sunday" into an opening-hours
 * panel, and neither can a visitor's phone. Seven day rows with explicit open
 * and close times produce real `OpeningHoursSpecification` markup.
 *
 * The free-text field is KEPT and still wins when the day rows are empty —
 * some businesses genuinely are "by appointment", and forcing that into a
 * grid would either lose the nuance or invent hours nobody stated.
 */
export const DAYS = [
  { key: "monday", label: "Monday", schema: "Monday" },
  { key: "tuesday", label: "Tuesday", schema: "Tuesday" },
  { key: "wednesday", label: "Wednesday", schema: "Wednesday" },
  { key: "thursday", label: "Thursday", schema: "Thursday" },
  { key: "friday", label: "Friday", schema: "Friday" },
  { key: "saturday", label: "Saturday", schema: "Saturday" },
  { key: "sunday", label: "Sunday", schema: "Sunday" },
] as const;

/** 24-hour HH:MM. Schema.org wants this shape; so does every parser. */
export const TIME_PATTERN = "^([01]\\d|2[0-3]):[0-5]\\d$";

/** Article slugs become URLs; date feeds JSON-LD. Both are load-bearing. */
export const INSIGHT_SLUG_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
export const INSIGHT_DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

/**
 * A date can match the pattern and still not exist. "2026-00-10" and
 * "2026-13-05" both satisfy \d{4}-\d{2}-\d{2}, and both used to sail through
 * every validator — the Keeper's, the CI gate's, and the panel's plain text
 * input — because the pattern was the only check anywhere.
 *
 * The consequence was found by the audit and reproduced against this repo's
 * own Next: publishedArticles() compares date STRINGS, so "2026-00-10" counts
 * as published immediately; sitemap.ts then builds `new Date("2026-00-10")`,
 * which is Invalid Date, and Next's sitemap resolver calls .toISOString() on
 * it — RangeError, and EVERY subsequent build on both hosts fails until the
 * committed JSON is hand-edited. The month-13 variant is worse: it
 * string-compares as future, deploys green for months, and starts crashing
 * every build on New Year's Day with zero content changes.
 *
 * So validity means the date ROUND-TRIPS: parse as UTC, print it back,
 * get the same string. Day overflow is caught too ("2026-02-31" silently
 * becomes March 3rd in V8, which would put one date on the page and a
 * different one in the sitemap).
 */
export function isRealCalendarDate(value: string): boolean {
  if (!new RegExp(INSIGHT_DATE_PATTERN).test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * PHRASES THE OWNER'S PROSE MAY NOT CONTAIN.
 *
 * The credential fields are gated, but prose fields (founder message, service
 * copy, testimonials) would otherwise be an open side door: type "fully
 * insured, best prices guaranteed" into the founder message and every
 * credential gate above is bypassed. The build refuses these phrases anywhere
 * in owner-editable prose, so the only way to claim a credential is through
 * the field that requires its evidence.
 *
 * Case-insensitive regex sources, matched by scripts/check-content.mjs.
 */
/*
  WORD BOUNDARIES ARE LOAD-BEARING HERE, and their absence was a live bug.
  scripts/check-content.mjs carries its own copies of these patterns WITH
  \b anchors; these shared strings lacked them, and the Keeper's live
  validator uses the shared strings. Result: the panel refused "unlicensed",
  "uninsured", "uncertified" — words an honest description of the trade can
  legitimately contain, and which the CI gate would have accepted. The owner
  was blocked in the editor by a rule the build did not actually have.
  If these ever change, change the literals in check-content.mjs to match.
*/
export const FORBIDDEN_IN_PROSE: readonly { pattern: string; why: string }[] = [
  { pattern: "same[ -]day", why: "a turnaround promise nobody has verified" },
  { pattern: "\\binstant(ly)?\\b", why: "a speed promise nobody has verified" },
  { pattern: "guarantee[ds]?\\b", why: "a guarantee is a legal commitment" },
  { pattern: "(best|highest|top) (price|rate|value)", why: "an unverifiable market claim" },
  { pattern: "no (fee|charge|cost)s?\\b", why: "a pricing promise nobody has verified" },
  { pattern: "free valuation", why: "a pricing promise nobody has verified" },
  { pattern: "within \\d+ ?(minute|hour|day)s?", why: "a turnaround promise nobody has verified" },
  { pattern: "\\d+ ?%", why: "percentages read as offers or rates" },
  {
    pattern: "\\b(licen[cs]ed|certified|insured|accredited|regulated|registered with)\\b",
    why: "credentials may only be claimed through their own evidence-gated field",
  },
];
