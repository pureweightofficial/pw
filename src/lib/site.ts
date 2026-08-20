/**
 * PUREWEIGHT GOLD EXCHANGE — SINGLE SOURCE OF TRUTH
 *
 * ---------------------------------------------------------------------------
 * CONTENT GUARDRAIL
 * ---------------------------------------------------------------------------
 * Nothing in this file may state a business fact that has not been supplied and
 * verified by the client. Every such field is modelled as `Verifiable<T>`:
 *
 *   { status: 'verified', value: ... }   -> renders as fact, may enter JSON-LD
 *   { status: 'placeholder', label: ... } -> renders as a visible placeholder
 *
 * The `isVerified()` guard is the only way to read a value, so an unverified
 * field cannot be rendered as fact by accident. Structured data is emitted ONLY
 * from verified fields — see `buildLocalBusinessJsonLd()`. If the client has not
 * confirmed a field, we would rather ship a visible gap than an invented fact.
 *
 * TO GO LIVE: replace each `placeholder` entry with a `verified` entry.
 * A checklist of every outstanding item is in CONTENT-PLACEHOLDERS.md.
 */

import content from "@/content/business.json";
import servicesContent from "@/content/services.json";
import testimonialsContent from "@/content/testimonials.json";
import { assetPath } from "@/lib/asset";
import { BUSINESS_RULES, DAYS, SERVICE_IDS, TIME_PATTERN } from "@/lib/content-schema";

/**
 * THE ONE PLACE THE SITE'S LANGUAGE IS DECLARED.
 *
 * It was hardcoded in the root layout's <html lang> and nowhere else, which
 * made an unresolved question invisible: the prose here is British English —
 * "jewellery" thirty-six times, "jewelry" never, sovereigns, hallmarks, and a
 * VAT field in the Keeper — while the only address anyone has entered is
 * 250 John W Morrow Jr Pkwy #121, Gainesville, GA 30501. That address is a
 * real multi-tenant retail centre in Georgia, USA (verified against public
 * listings), so this is not a typo in a placeholder; it is a genuine
 * contradiction between the content and the market.
 *
 * It is NOT resolved here, because it is not a code decision. A US customer
 * searching to sell an inherited ring types "jewelry", a word this site does
 * not contain, so the answer changes what the business earns — and only the
 * owner knows which market is real. Declaring en-US over British spelling
 * would merely mislabel the prose.
 *
 * What this constant buys is that the decision costs one line when it comes.
 */
export const SITE_LOCALE = "en-GB";

export type Verifiable<T> =
  { status: "verified"; value: T } | { status: "placeholder"; label: string };

export function isVerified<T>(
  f: Verifiable<T>,
): f is { status: "verified"; value: T } {
  return f.status === "verified";
}

/** Reads a verified value, or `null` when the field is still a placeholder. */
export function verifiedValue<T>(f: Verifiable<T>): T | null {
  return isVerified(f) ? f.value : null;
}

const pending = (label: string): Verifiable<never> => ({
  status: "placeholder",
  label,
});

/* -------------------------------------------------------------------------- */
/* BRAND                                                                      */
/* -------------------------------------------------------------------------- */

export const brand = {
  name: "Pureweight Gold Exchange",
  shortName: "Pureweight",
  monogram: "PW",
  /**
   * Positioning line. This is brand voice, not a factual claim — it describes
   * the intent of the service rather than asserting a credential.
   */
  positioning: "We buy gold and silver, weighed and valued in front of you.",
  /** Update once the production domain is confirmed. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pureweight.example",
} as const;

/**
 * SEARCH INDEXING — OFF UNTIL EXPLICITLY ENABLED
 *
 * While the placeholders in this file are unfilled, the site is a page branded
 * as a real gold business carrying unverified details. Letting a search engine
 * index that — at a staging URL, under the client's name, with an address slot
 * reading `[INSERT CONFIRMED TRADING ADDRESS]` — is a genuine reputational
 * problem for them, and one that outlives the deployment: the URL can sit in
 * results long after it is taken down.
 *
 * So indexing is opt-in, not opt-out. Every deployment is noindex until someone
 * sets `NEXT_PUBLIC_ALLOW_INDEXING=true`, which should only happen once
 * CONTENT-PLACEHOLDERS.md is cleared and the real domain is live.
 */
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

/* -------------------------------------------------------------------------- */
/* BUSINESS FACTS — all pending client verification                           */
/* -------------------------------------------------------------------------- */

/**
 * Each field is typed with the shape its verified value must take, so that
 * filling one in is type-checked rather than free-form. `pending()` returns
 * `Verifiable<never>`, which satisfies every one of these.
 */
export type BusinessFacts = {
  legalName: Verifiable<string>;
  registrationNumber: Verifiable<string>;
  vatNumber: Verifiable<string>;
  yearEstablished: Verifiable<string>;
  address: Verifiable<string>;
  serviceArea: Verifiable<string>;
  telephone: Verifiable<string>;
  email: Verifiable<string>;
  openingHours: Verifiable<string>;
  appointmentProcess: Verifiable<string>;
  settlementMethods: Verifiable<string>;
  priceReferenceSource: Verifiable<string>;
  insurance: Verifiable<string>;
  memberships: Verifiable<string>;
  certifications: Verifiable<string>;
  licences: Verifiable<string>;
  securityProcedures: Verifiable<string>;
  weighingEquipment: Verifiable<string>;
  reviewScore: Verifiable<string>;
  founderMessage: Verifiable<string>;
  foundingStory: Verifiable<string>;
  /** Absolute profile URLs. Feeds `sameAs` in structured data once verified. */
  social: Verifiable<string[]>;
};

/**
 * THE FACTS NOW LIVE IN src/content/business.json, EDITED BY THE OWNER AT
 * /keeper — AND STATUS IS DERIVED, NEVER ASSERTED.
 *
 * The panel has no "verified" switch. A field FILLED IN becomes a fact; a
 * field LEFT BLANK renders as the same visible placeholder as always. The
 * `[INSERT …]` labels live in content-schema.ts, which the panel does not
 * expose, so the owner cannot edit the guardrail — only the content.
 *
 * Three qualifications a value must clear before it is treated as fact:
 *   - non-empty after trimming;
 *   - matching its schema pattern (a phone number must look like one);
 *   - accompanied by its companions (`insurance` without `insuranceIssuer`
 *     stays a placeholder — a credential that cannot name its issuer is not
 *     a credential).
 *
 * scripts/check-content.mjs enforces the same table in CI before the export,
 * so malformed JSON fails the build rather than shipping. The address was
 * verified 2026-07-31 (supplied by the client) and is seeded in the JSON.
 */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function deriveFact(key: keyof typeof BUSINESS_RULES): Verifiable<string> {
  const rule = BUSINESS_RULES[key];
  const value = str((content as Record<string, unknown>)[key]);
  if (value === "") return pending(rule.placeholder);
  if ("pattern" in rule && rule.pattern && !new RegExp(rule.pattern).test(value)) {
    return pending(rule.placeholder);
  }
  if ("requires" in rule && rule.requires) {
    for (const companion of rule.requires) {
      if (str((content as Record<string, unknown>)[companion]) === "") {
        return pending(rule.placeholder);
      }
    }
  }
  return { status: "verified", value: composeFact(key, value) };
}

/** Folds a credential's companion into its rendered value. */
function composeFact(key: string, value: string): string {
  if (key === "insurance") return `${value} — ${str(content.insuranceIssuer)}`;
  if (key === "reviewScore") return `${value} — ${str(content.reviewScoreSource)}`;
  return value;
}

function deriveSocial(): Verifiable<string[]> {
  const raw = Array.isArray(content.social) ? content.social : [];
  const urls = raw.map(str).filter((u) => /^https:\/\/.+/.test(u));
  return urls.length > 0
    ? { status: "verified", value: urls }
    : pending(BUSINESS_RULES.social.placeholder);
}

export const business: BusinessFacts = {
  legalName: deriveFact("legalName"),
  registrationNumber: deriveFact("registrationNumber"),
  vatNumber: deriveFact("vatNumber"),
  yearEstablished: deriveFact("yearEstablished"),
  address: deriveFact("address"),
  serviceArea: deriveFact("serviceArea"),
  telephone: deriveFact("telephone"),
  email: deriveFact("email"),
  openingHours: deriveFact("openingHours"),
  appointmentProcess: deriveFact("appointmentProcess"),
  settlementMethods: deriveFact("settlementMethods"),
  priceReferenceSource: deriveFact("priceReferenceSource"),
  insurance: deriveFact("insurance"),
  memberships: deriveFact("memberships"),
  certifications: deriveFact("certifications"),
  licences: deriveFact("licences"),
  securityProcedures: deriveFact("securityProcedures"),
  weighingEquipment: deriveFact("weighingEquipment"),
  reviewScore: deriveFact("reviewScore"),
  founderMessage: deriveFact("founderMessage"),
  foundingStory: deriveFact("foundingStory"),
  social: deriveSocial(),
};

/* -------------------------------------------------------------------------- */
/* NAVIGATION                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Every item is a real PAGE now, not a homepage anchor. Anchors made the nav
 * a table of contents for one document; these are destinations with their own
 * 800+ words of standalone content, their own metadata, and their own place
 * in the sitemap — which is what lets each topic rank and be cited
 * independently. The homepage sections remain the cinematic versions, and
 * each page links back to its section.
 */
export const primaryNav = [
  { label: "What We Buy", href: "/what-we-buy" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Purity & Weight", href: "/purity-and-weight" },
  { label: "About", href: "/about" },
  { label: "Insights", href: "/insights" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * The nav's single action. Points at the shop rather than at a form: this trade
 * happens over the counter, so the useful thing to offer is the address and the
 * hours. See VisitCta for why the label is not "Call us" — the number is still an
 * unconfirmed fact and must not be implied here.
 */
export const navCta = {
  label: "Visit the Shop",
  href: "/contact",
} as const;

/* -------------------------------------------------------------------------- */
/* CHAPTERS — the scroll spine                                                */
/* -------------------------------------------------------------------------- */

export const chapters = [
  { id: "trust", index: "01", title: "True Value" },
  { id: "journey", index: "02", title: "How It Works" },
  { id: "services", index: "03", title: "What We Buy" },
  { id: "assay", index: "04", title: "Purity & Weight" },
  { id: "pillars", index: "05", title: "Built on Trust" },
  { id: "appointment", index: "06", title: "Come and See Us" },
] as const;

/* -------------------------------------------------------------------------- */
/* VALUATION JOURNEY                                                          */
/* -------------------------------------------------------------------------- */

/**
 * WHAT HAPPENS AT THE COUNTER.
 *
 * Four steps, not the five the client described, because their first step —
 * "customer checks current gold and silver prices" — is not something that
 * happens here. It happens in the market panel further up this same page, which
 * is why that panel sits directly beneath the hero. Repeating it as step one
 * would be describing the website to itself.
 *
 * Each `body` is what the client confirmed about their own trade. Each `detail`
 * describes process only, and deliberately promises no timing, no percentage and
 * no amount — those are unverified facts and stay behind the placeholder guard.
 *
 * `tilt` is the beam angle the 3D instrument takes at this stage: weighted down
 * by the goods at the start, level once the exchange completes.
 */
export const journey = [
  {
    step: "01",
    title: "Bring It In",
    body: "Come to the shop with whatever you have — jewellery, coins, bars, or a drawer of odds and ends.",
    detail:
      "Nothing needs sorting, cleaning or valuing beforehand. Broken chains, single earrings and pieces with the stones still in them are all perfectly normal, and there is no minimum worth bringing.",
    tilt: -2.4,
  },
  {
    step: "02",
    title: "Weighed In Front of You",
    body: "Each item is examined and weighed at the counter while you watch, not taken away.",
    detail:
      "Hallmarks are read under magnification, and where a mark is worn or absent the metal is tested rather than assumed. The scale stays where you can see it and the weight is read out as it is taken.",
    tilt: -1.4,
  },
  {
    step: "03",
    title: "An Offer Against the Market",
    body: "You are told what the metal weighs, how pure it is, and what we can pay for it.",
    detail:
      "Precious metal prices move through the trading day, so the figure relates to the market at that moment. How it is arrived at is shown rather than summarised — weight, fineness, and the market reference it is measured against.",
    tilt: -0.5,
  },
  {
    step: "04",
    title: "Accept, or Take It Home",
    body: "If the figure suits you the sale completes there and then. If it does not, your items go back in your pocket.",
    detail:
      "There is no obligation at any point and no charge for having looked. Declining is an ordinary outcome and is treated as one.",
    tilt: 0,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* SERVICES — placeholders until the client confirms the exact offering       */
/* -------------------------------------------------------------------------- */

export type Service = {
  /*
    The stable slug — "jewellery", "silver", "coins", "bullion". It already
    existed on SERVICE_SKELETON and was being dropped on the way out, so
    consumers had no way to link to a specific service. The footer needs it to
    deep-link into /what-we-buy#<id> instead of pointing all four of its
    service links at one homepage anchor.
  */
  id: (typeof SERVICE_IDS)[number];
  index: string;
  title: string;
  summary: string;
  body: string;
  points: readonly string[];
  cta: string;
  /**
   * Where the panel's CTA goes.
   *
   * The brief suggested "Explore Gold Valuation" style labels pointing at
   * per-service pages. Those pages cannot be written yet — the services
   * themselves are unconfirmed — so a CTA reading "Explore" that lands on an
   * enquiry form would be promising a page that does not exist. Instead each
   * CTA says what it actually does and carries the item type into the form, so
   * step one arrives already answered.
   */
  enquiryHref: string;
  /**
   * Panel photograph. Omitted where no honest image exists — the panel then
   * falls back to its engraved plate rather than to generic stock.
   *
   * Two panels are deliberately without one. Provenance, the selection rubric,
   * and the record of two images REMOVED for showing another refiner's trademark
   * and serial numbers are all in public/img/CREDITS.md. Read it before adding
   * anything here.
   */
  image?: string;
  /**
   * Alt text for that photograph. Required whenever `image` is set.
   *
   * Describes the PHOTOGRAPH, not the heading. The panels previously shipped
   * `alt=""`, which is defensible — the heading, summary and bullets already
   * carry every fact, so the image is decorative in the strict sense. But these
   * are the nearest thing this site has to product imagery, and a real
   * description costs nothing in accessibility terms while being the only thing
   * image search has to work with. Repeating the heading here would be the
   * redundancy an empty alt exists to avoid.
   */
  imageAlt?: string;
  /** false => rendered with a visible "pending confirmation" marker. */
  confirmed: boolean;
};

/**
 * WHAT WE BUY.
 *
 * The client confirmed the trade: they BUY gold and silver — jewellery, coins and
 * bullion. They do not sell, they do not run a church fundraising programme, and
 * there is ONE shop rather than several. All three were offered and all three
 * were declined, so none of them appears anywhere on this site.
 *
 * `confirmed: true` here means exactly one thing: the client has confirmed they
 * buy this category. It does not license claims about HOW. So each `points` entry
 * describes what falls inside the category — checkable by looking at the item in
 * your hand — and never a process promise, a timescale or a rate. Those remain
 * unverified business facts behind the placeholder guard.
 */
/**
 * THE SKELETON IS CODE; THE COPY IS CONTENT.
 *
 * Owner-editable strings (summary, body, points, image, imageAlt) come from
 * src/content/services.json via the keeper panel. Everything STRUCTURAL stays
 * here, deliberately out of the panel's reach:
 *
 *   - the four ids and their order. The panel cannot add or remove a service
 *     panel: services.json is modelled as four fixed objects, not a list, and
 *     this skeleton is what renders. An id missing from the JSON falls back
 *     to nothing-rendered-wrong: the build gate fails first.
 *   - `title`. Services.tsx keys its engraved plate artwork by title (after
 *     two positional-selection bugs), and the chapter list and nav reference
 *     these names. Renaming a service is a design change, not a content edit.
 *   - `confirmed`. The client confirmed these four categories; the panel must
 *     not be able to mark an unconfirmed category as confirmed.
 *   - images remain subject to public/img/CREDITS.md — the bullion image is
 *     the client's own (no refiner marks, checked at full resolution); its
 *     predecessor was removed for carrying another refiner's trademark,
 *     "1 KILO / 999.9 FINE GOLD" and three serials. The gate re-checks that
 *     every image has alt text, but provenance stays a human judgement.
 */
type EditableService = {
  summary: string;
  body: string;
  points: string[];
  image: string;
  imageAlt: string;
};

const SERVICE_SKELETON: readonly {
  id: (typeof SERVICE_IDS)[number];
  index: string;
  title: string;
  cta: string;
  enquiryHref: string;
  confirmed: boolean;
}[] = [
  { id: "jewellery", index: "01", title: "Gold Jewellery", cta: "Bring Jewellery In", enquiryHref: "/contact", confirmed: true },
  { id: "silver", index: "02", title: "Silver", cta: "Bring Silver In", enquiryHref: "/contact", confirmed: true },
  { id: "coins", index: "03", title: "Coins", cta: "Bring Coins In", enquiryHref: "/contact", confirmed: true },
  { id: "bullion", index: "04", title: "Bars & Bullion", cta: "Bring Bullion In", enquiryHref: "/contact", confirmed: true },
];

export const services: readonly Service[] = SERVICE_SKELETON.map((skeleton) => {
  const editable = (servicesContent as Record<string, EditableService>)[
    skeleton.id
  ];
  return {
    id: skeleton.id,
    index: skeleton.index,
    title: skeleton.title,
    summary: editable.summary,
    body: editable.body,
    points: editable.points,
    cta: skeleton.cta,
    // Image optional in the type; an empty path means the engraved plate.
    ...(str(editable.image) !== ""
      ? { image: editable.image, imageAlt: editable.imageAlt }
      : {}),
    enquiryHref: skeleton.enquiryHref,
    confirmed: skeleton.confirmed,
  };
});

/**
 * TESTIMONIALS — owner-supplied through the keeper, empty until real ones
 * exist. The Testimonials component renders its honest "none have been
 * supplied" state whenever this is empty; the build gate requires quote,
 * name and context on every entry, so a half-filled testimonial cannot ship.
 */
export const testimonials: readonly {
  quote: string;
  name: string;
  context: string;
  /** Optional portrait, /img/-relative. Supplied by the customer, via the owner. */
  photo: string;
  featured: boolean;
}[] = (
  (testimonialsContent.testimonials ?? []) as {
    quote?: unknown;
    name?: unknown;
    context?: unknown;
    photo?: unknown;
    featured?: unknown;
  }[]
)
  .map((t) => ({
    quote: str(t.quote),
    name: str(t.name),
    context: str(t.context),
    photo: str(t.photo),
    featured: t.featured === true,
  }))
  .filter((t) => t.quote !== "" && t.name !== "" && t.context !== "")
  // Featured first, otherwise the owner's order. Array sort is stable, so
  // ties keep their relative positions.
  .sort((a, b) => Number(b.featured) - Number(a.featured));

/* -------------------------------------------------------------------------- */
/* ASSAY FACTORS — educational, deliberately non-transactional                */
/* -------------------------------------------------------------------------- */

export const assayFactors = [
  {
    key: "weight",
    label: "Weight",
    reading: "Measured",
    body: "Gold is weighed in grams or troy ounces. One troy ounce is 31.1035 grams — a different unit from the ounce used for everyday goods, and the reason two scales can disagree.",
  },
  {
    key: "purity",
    label: "Purity",
    reading: "Verified",
    body: "Purity is expressed in carats out of 24, or as parts per thousand. 22ct is 916 parts gold per thousand; 18ct is 750; 9ct is 375. The balance is alloy, and it is not gold.",
  },
  {
    key: "condition",
    label: "Condition",
    reading: "Examined",
    body: "Solder, plating, stones, clasps and previous repairs all change how much gold a piece actually contains. Condition is examined under magnification, not estimated from appearance.",
  },
  {
    key: "reference",
    label: "Market Reference",
    reading: "Applied",
    body: "Verified weight and fineness are read against the market reference the business works to at the time of assessment. This site does not display live rates.",
  },
  {
    key: "evaluation",
    label: "Final Evaluation",
    reading: "Issued",
    body: "The measured factors are brought together into a single figure and explained in full. A final valuation is only ever issued in person by Pureweight, never by this website.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PILLARS                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The client's stated value proposition, with the promises removed.
 *
 * They gave: fast cash, fair market pricing, honest weighing, transparent
 * process, local trusted service, professional expertise. Several are unusable as
 * written. "Fast cash" is a timing promise. "Fair pricing" is a judgement for the
 * seller to make, not for the buyer to assert. "Trusted" is a claim about other
 * people's opinions and would need a genuine review source behind it.
 *
 * What survives is the same substance stated as method rather than as boast —
 * which is also the stronger version, because every line below is something a
 * customer can check while standing at the counter.
 */
export const pillars = [
  {
    title: "Weighed in front of you",
    body: "The scale stays where you can see it and the weight is read out as it is taken. Nothing is carried into a back room.",
  },
  {
    title: "Measured against the market",
    body: "Precious metal has a published market price. Any figure is related back to it, at the moment you are standing there.",
  },
  {
    title: "The working is shown",
    body: "Weight, the purity we have established, and how the two produce the figure — explained before you are asked to decide anything.",
  },
  {
    title: "No obligation, ever",
    body: "Having something examined and valued costs nothing. Taking it home again is an ordinary outcome, not an awkward one.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* TRUST STRIP — service characteristics, not credentials                     */
/* Each item describes how the service is conducted. None asserts an award,   */
/* licence, certification or statistic. Credentials live in `business` above  */
/* and stay behind the verification guard.                                    */
/* -------------------------------------------------------------------------- */

export const trustStrip = [
  "Weighed at the Counter",
  "Market-Referenced Figures",
  "Gold, Silver, Coins, Bullion",
  "No Obligation to Sell",
] as const;

/* -------------------------------------------------------------------------- */
/* INSIGHTS — topics planned; article bodies are not written yet              */
/* -------------------------------------------------------------------------- */

export const insightTopics = [
  { title: "How Gold Purity Is Measured", category: "Fundamentals" },
  { title: "Understanding Gold Hallmarks", category: "Fundamentals" },
  { title: "What Affects the Value of Gold?", category: "Valuation" },
  { title: "Bullion Versus Jewellery Valuation", category: "Valuation" },
  { title: "How to Prepare Gold for an Evaluation", category: "Practical" },
  { title: "Understanding Gold Weight Measurements", category: "Fundamentals" },
  { title: "What to Bring to a Private Valuation", category: "Practical" },
  { title: "Common Gold Valuation Questions", category: "Practical" },
] as const;

/* -------------------------------------------------------------------------- */
/* STRUCTURED DATA                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Builds LocalBusiness JSON-LD from VERIFIED fields only.
 *
 * Returns `null` when the minimum verified set (name + address) is absent, so
 * the page emits no structured data at all rather than structured data
 * containing placeholder text. Emitting `[INSERT ADDRESS]` to a search engine
 * would be worse than emitting nothing.
 */
/**
 * STRUCTURED OPENING HOURS.
 *
 * Reads the seven day rows. A day counts only when it is either marked closed
 * or carries BOTH a valid open and close time — a half-filled row is silently
 * ignored rather than published as a guess, which is the same rule every other
 * fact on this site follows.
 */
export type DayHours = { label: string; schema: string; closed: boolean; open: string; close: string };

export function structuredHours(): DayHours[] {
  const raw = (content as Record<string, unknown>).hours as Record<string, unknown> | undefined;
  if (!raw) return [];
  const time = new RegExp(TIME_PATTERN);
  const out: DayHours[] = [];
  for (const day of DAYS) {
    const row = (raw[day.key] ?? {}) as Record<string, unknown>;
    const closed = row.closed === true;
    const open = str(row.open);
    const close = str(row.close);
    if (closed) {
      out.push({ label: day.label, schema: day.schema, closed: true, open: "", close: "" });
    } else if (time.test(open) && time.test(close)) {
      out.push({ label: day.label, schema: day.schema, closed: false, open, close });
    }
  }
  // All seven or nothing: a partial week published as if complete would imply
  // the missing days are closed, which is a claim nobody made.
  return out.length === DAYS.length ? out : [];
}

/**
 * THE STRUCTURED-DATA LADDER.
 *
 * An audit of the live site found ELEVEN OF THIRTEEN PAGES carrying no
 * structured data whatsoever. `buildLocalBusinessJsonLd` returns null without
 * a verified legal name — correctly, since LocalBusiness without one is a
 * claim nobody has checked — and nothing was emitted in its place. So the site
 * told answer engines nothing about which entity it belongs to, on almost
 * every page.
 *
 * That was over-correction rather than caution. `Organization` and `WebSite`
 * assert only what this website self-evidently is: its trading name, its own
 * address on the web, and its own logo file. None of those is a credential, a
 * registration, or a promise — they are the site describing itself, which is
 * exactly what entity resolution needs and precisely the thing an AI answer
 * engine uses to decide who is speaking.
 *
 * The ladder: Organization + WebSite always; LocalBusiness replaces the
 * Organization node the moment a legal name and address are both verified, so
 * filling those fields in the Keeper upgrades the markup with no code change.
 */
export function buildSiteJsonLd(): Record<string, unknown>[] {
  /*
    Every node below carries `url`, and `brand.url` falls back to the reserved
    example domain when NEXT_PUBLIC_SITE_URL is unset. Emitting that would
    publish a web address this business does not own into structured data —
    the same category of fabrication the placeholder system exists to prevent,
    only machine-readable. The deploy workflow sets the real URL; anything that
    does not, gets no markup.
  */
  if (/\.example(\/|$)/.test(brand.url)) return [];

  const local = buildLocalBusinessJsonLd();

  const entity: Record<string, unknown> = local ?? {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: brand.url,
    description: brand.positioning,
  };

  /*
    The logo ships with the site, so its existence is not in question — but its
    URL was, briefly. Concatenating brand.url with assetPath() produced
    .../pw/pw/brand/logo.webp, because brand.url ALREADY ends in the basePath
    and assetPath prepends it again. Resolving through the URL constructor
    lets the absolute path replace the base's path exactly once, which is the
    behaviour wanted and the reason not to do this with string joins.
  */
  entity.logo = new URL(assetPath("/brand/pureweight-logo.webp"), brand.url).href;

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: brand.url,
    inLanguage: SITE_LOCALE,
    publisher: { "@type": local ? "LocalBusiness" : "Organization", name: brand.name },
  };

  return [entity, website];
}

/**
 * HowTo MARKUP FOR THE FOUR STAGES, DERIVED — NOT AUTHORED.
 *
 * "How does selling gold work" is a question people type and speak, and it is
 * the shape of query an answer engine most wants a structured source for. The
 * page already answers it in four ordered stages; it simply never said so in a
 * form a machine could read, so the answer was there to be quoted and nothing
 * marked it as steps.
 *
 * Every field below comes from the `journey` array that renders the visible
 * page. Nothing here is written for the crawler's benefit, which is the whole
 * point: markup that says something the page does not is the fastest way to
 * lose the rich result it was added to win.
 */
export function buildHowToJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How selling gold over the counter works",
    description:
      "The four stages of an over-the-counter gold valuation: bringing items in, weighing and examination in front of you, an offer against the market, and your decision.",
    inLanguage: SITE_LOCALE,
    step: journey.map((stage, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: stage.title,
      text: stage.body,
      url: `${brand.url.replace(/\/$/, "")}${canonicalPath("/how-it-works")}`,
    })),
  };
}

export function buildLocalBusinessJsonLd(): Record<string, unknown> | null {
  const address = verifiedValue(business.address);
  const legalName = verifiedValue(business.legalName);

  if (!address || !legalName) return null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: brand.name,
    legalName,
    url: brand.url,
    address,
  };

  const telephone = verifiedValue(business.telephone);
  if (telephone) jsonLd.telephone = telephone;

  const email = verifiedValue(business.email);
  if (email) jsonLd.email = email;

  /*
    Structured hours WIN over the free-text field when a full week exists,
    because `OpeningHoursSpecification` is what actually populates an opening-
    hours panel in search results. The free text remains the fallback, and
    remains the right answer for a business that trades by appointment.
  */
  const week = structuredHours();
  if (week.length > 0) {
    jsonLd.openingHoursSpecification = week
      .filter((d) => !d.closed)
      .map((d) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${d.schema}`,
        opens: d.open,
        closes: d.close,
      }));
  } else {
    const hours = verifiedValue(business.openingHours);
    if (hours) jsonLd.openingHours = hours;
  }

  const area = verifiedValue(business.serviceArea);
  if (area) jsonLd.areaServed = area;

  const social = verifiedValue(business.social);
  if (Array.isArray(social) && social.length > 0) jsonLd.sameAs = social;

  return jsonLd;
}

/* -------------------------------------------------------------------------- */
/* URL + OPENGRAPH HELPERS                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The Pages export sets `trailingSlash: true`, so every served URL ends in a
 * slash there — but the node target does not. Canonicals and sitemap entries
 * built without knowing this 301'd (sitemap) or mismatched the served URL
 * (canonicals) on the Pages target. One helper, both targets correct.
 */
const TRAILING_SLASH = process.env.GITHUB_PAGES === "true";

export function canonicalPath(path: string): string {
  if (path === "/") return "/";
  const clean = path.replace(/\/+$/, "");
  return TRAILING_SLASH ? `${clean}/` : clean;
}

/**
 * A COMPLETE OpenGraph object for a page.
 *
 * Next's metadata merge replaces `openGraph` wholesale rather than deep-merging
 * it, which produced two failure modes the audit confirmed: pages with no
 * openGraph inherited the homepage's og:url on every subpage, and the one page
 * that declared a partial openGraph lost og:image, og:site_name and og:type
 * entirely. Every page therefore builds its full block through here.
 */
export function ogFor({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    type: "website" as const,
    siteName: brand.name,
    title,
    description,
    url: canonicalPath(path),
    /**
     * Explicit, because declaring `openGraph` in page metadata SUPPRESSES the
     * root opengraph-image file convention — verified: subpages built through
     * this helper shipped zero og:image until this line. The path resolves
     * against metadataBase; every page shares the one generated card.
     */
    images: ["/opengraph-image"],
  };
}

/** Every outstanding placeholder, for the build-time content report. */
export function outstandingPlaceholders(): string[] {
  return Object.entries(business)
    .filter(
      ([, field]) => (field as Verifiable<unknown>).status === "placeholder",
    )
    .map(([key, field]) => `${key}: ${(field as { label: string }).label}`);
}
