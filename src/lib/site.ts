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

export type Verifiable<T> =
  | { status: 'verified'; value: T }
  | { status: 'placeholder'; label: string };

export function isVerified<T>(f: Verifiable<T>): f is { status: 'verified'; value: T } {
  return f.status === 'verified';
}

/** Reads a verified value, or `null` when the field is still a placeholder. */
export function verifiedValue<T>(f: Verifiable<T>): T | null {
  return isVerified(f) ? f.value : null;
}

const pending = (label: string): Verifiable<never> => ({ status: 'placeholder', label });

/* -------------------------------------------------------------------------- */
/* BRAND                                                                      */
/* -------------------------------------------------------------------------- */

export const brand = {
  name: 'Pureweight Gold Exchange',
  shortName: 'Pureweight',
  monogram: 'PW',
  /**
   * Positioning line. This is brand voice, not a factual claim — it describes
   * the intent of the service rather than asserting a credential.
   */
  positioning: 'Private gold evaluation and exchange, guided by precision.',
  /** Update once the production domain is confirmed. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pureweight.example',
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
export const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

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

export const business: BusinessFacts = {
  legalName: pending('[INSERT REGISTERED LEGAL NAME]'),
  registrationNumber: pending('[INSERT VERIFIED BUSINESS REGISTRATION NUMBER]'),
  vatNumber: pending('[INSERT VAT / TAX NUMBER, IF APPLICABLE]'),
  yearEstablished: pending('[INSERT CONFIRMED YEAR ESTABLISHED]'),
  address: pending('[INSERT CONFIRMED TRADING ADDRESS]'),
  serviceArea: pending('[INSERT CONFIRMED SERVICE AREA]'),
  telephone: pending('[INSERT VERIFIED TELEPHONE NUMBER]'),
  email: pending('[INSERT VERIFIED ENQUIRY EMAIL ADDRESS]'),
  openingHours: pending('[INSERT CONFIRMED OPENING HOURS]'),
  appointmentProcess: pending('[INSERT VERIFIED APPOINTMENT PROCESS]'),
  settlementMethods: pending('[INSERT CONFIRMED SETTLEMENT / PAYMENT METHODS]'),
  priceReferenceSource: pending('[INSERT APPROVED GOLD-PRICE REFERENCE SOURCE]'),
  insurance: pending('[INSERT VERIFIED INSURANCE DETAILS]'),
  memberships: pending('[INSERT VERIFIED PROFESSIONAL MEMBERSHIPS]'),
  certifications: pending('[INSERT VERIFIED CERTIFICATIONS]'),
  licences: pending('[INSERT VERIFIED LICENCES]'),
  securityProcedures: pending('[INSERT CONFIRMED SECURITY PROCEDURES]'),
  weighingEquipment: pending('[INSERT CONFIRMED WEIGHING / ASSAY EQUIPMENT]'),
  reviewScore: pending('[INSERT GENUINE AGGREGATE REVIEW SCORE + SOURCE]'),
  founderMessage: pending('[INSERT FOUNDER MESSAGE]'),
  foundingStory: pending('[INSERT VERIFIED FOUNDING STORY]'),
  social: pending('[INSERT CONFIRMED SOCIAL CHANNELS]'),
};

/* -------------------------------------------------------------------------- */
/* NAVIGATION                                                                 */
/* -------------------------------------------------------------------------- */

export const primaryNav = [
  { label: 'The Process', href: '/#journey' },
  { label: 'Services', href: '/#services' },
  { label: 'Purity & Weight', href: '/#assay' },
  { label: 'About', href: '/#story' },
  { label: 'Insights', href: '/insights' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
] as const;

export const navCta = {
  label: 'Request a Valuation',
  href: '/request-a-valuation',
} as const;

/* -------------------------------------------------------------------------- */
/* CHAPTERS — the scroll spine                                                */
/* -------------------------------------------------------------------------- */

export const chapters = [
  { id: 'trust', index: '01', title: 'True Value' },
  { id: 'journey', index: '02', title: 'The Process' },
  { id: 'services', index: '03', title: 'The Services' },
  { id: 'assay', index: '04', title: 'Purity & Weight' },
  { id: 'pillars', index: '05', title: 'Built on Trust' },
  { id: 'appointment', index: '06', title: 'Begin Your Exchange' },
] as const;

/* -------------------------------------------------------------------------- */
/* VALUATION JOURNEY                                                          */
/* -------------------------------------------------------------------------- */

export const journey = [
  {
    step: '01',
    title: 'Discover the Weight',
    body: 'The process begins with identifying the item and establishing its accurate weight.',
    detail:
      'Items are recorded and weighed on the calibrated equipment held at the counter. Weight is the first fixed quantity in any valuation, and everything that follows is measured against it.',
    /** Beam tilt, in degrees, for this stage of the story. */
    tilt: -2.4,
  },
  {
    step: '02',
    title: 'Verify the Purity',
    body: "Hallmarks, material composition and purity are reviewed using the company's confirmed assessment process.",
    detail:
      'Marks are examined under magnification and the material is assessed for fineness. Where a mark is absent, worn or unclear, the item is examined further before any figure is discussed.',
    tilt: -1.4,
  },
  {
    step: '03',
    title: 'Establish the Value',
    body: "The verified characteristics are considered against the business's approved valuation method.",
    detail:
      'Weight and fineness are read together against the reference the business works to at the time of assessment. You are shown how the figure is composed before you are asked to decide anything.',
    tilt: -0.5,
  },
  {
    step: '04',
    title: 'Complete the Exchange',
    body: 'The customer reviews the valuation and proceeds through the confirmed exchange or settlement process.',
    detail:
      'Nothing is committed until the figure is understood and accepted. Settlement then follows the process the business has confirmed for that item type.',
    tilt: 0,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* SERVICES — placeholders until the client confirms the exact offering       */
/* -------------------------------------------------------------------------- */

export type Service = {
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
   * Provenance: public/img/CREDITS.md
   */
  image?: string;
  /** false => rendered with a visible "pending confirmation" marker. */
  confirmed: boolean;
};

export const services: readonly Service[] = [
  {
    index: '01',
    title: 'Gold Valuation',
    summary: 'An itemised assessment of weight, fineness and condition.',
    body: 'Each piece is weighed, examined and recorded individually rather than assessed as a single lot. You see the figures the valuation is built from, not only the result.',
    points: ['Individually weighed', 'Hallmark examination', 'Itemised written summary'],
    cta: 'Enquire About Gold Valuation',
    image: '/img/valuation.jpg',
    enquiryHref: '/request-a-valuation?item=unsure',
    confirmed: false,
  },
  {
    index: '02',
    title: 'Bullion Exchange',
    summary: 'Bars and coins assessed on stated fineness and verified weight.',
    body: 'Refiner marks, serial numbers and stated fineness are checked against the physical weight of the piece. Recognised bullion is handled on its own terms and is not treated as scrap.',
    points: ['Refiner mark check', 'Serial recorded where present', 'Bars and coin'],
    cta: 'Enquire About Bullion Exchange',
    image: '/img/bullion.jpg',
    enquiryHref: '/request-a-valuation?item=bullion',
    confirmed: false,
  },
  {
    index: '03',
    title: 'Jewellery Evaluation',
    summary: 'Worn, inherited and broken pieces examined under inspection light.',
    body: 'Settings, solder, clasps and stones all affect the recoverable metal in a piece. These are identified and explained rather than quietly discounted.',
    points: ['Stone and setting allowance', 'Mixed-carat sorting', 'Antique pieces considered'],
    cta: 'Enquire About Jewellery Evaluation',
    image: '/img/jewellery.jpg',
    enquiryHref: '/request-a-valuation?item=jewellery',
    confirmed: false,
  },
  {
    index: '04',
    title: 'Private Appointments',
    summary: 'A scheduled, unhurried consultation away from the counter.',
    body: 'For larger holdings, estates and confidential matters, an appointment gives the time an item deserves and keeps the conversation private.',
    points: ['By arrangement', 'Confidential handling', 'Estate and probate matters'],
    cta: 'Request a Private Appointment',
    enquiryHref: '/request-a-valuation?appointment=in-person',
    confirmed: false,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* ASSAY FACTORS — educational, deliberately non-transactional                */
/* -------------------------------------------------------------------------- */

export const assayFactors = [
  {
    key: 'weight',
    label: 'Weight',
    reading: 'Measured',
    body: 'Gold is weighed in grams or troy ounces. One troy ounce is 31.1035 grams — a different unit from the ounce used for everyday goods, and the reason two scales can disagree.',
  },
  {
    key: 'purity',
    label: 'Purity',
    reading: 'Verified',
    body: 'Purity is expressed in carats out of 24, or as parts per thousand. 22ct is 916 parts gold per thousand; 18ct is 750; 9ct is 375. The balance is alloy, and it is not gold.',
  },
  {
    key: 'condition',
    label: 'Condition',
    reading: 'Examined',
    body: 'Solder, plating, stones, clasps and previous repairs all change how much gold a piece actually contains. Condition is examined under magnification, not estimated from appearance.',
  },
  {
    key: 'reference',
    label: 'Market Reference',
    reading: 'Applied',
    body: 'Verified weight and fineness are read against the market reference the business works to at the time of assessment. This site does not display live rates.',
  },
  {
    key: 'evaluation',
    label: 'Final Evaluation',
    reading: 'Issued',
    body: 'The measured factors are brought together into a single figure and explained in full. A final valuation is only ever issued in person by Pureweight, never by this website.',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* PILLARS                                                                    */
/* -------------------------------------------------------------------------- */

export const pillars = [
  {
    title: 'Precision',
    body: 'Accurate measurement provides the foundation for every professional valuation.',
  },
  {
    title: 'Transparency',
    body: 'Customers should clearly understand the factors considered during the evaluation process.',
  },
  {
    title: 'Trust',
    body: 'Every interaction should feel private, respectful and professionally managed.',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* TRUST STRIP — service characteristics, not credentials                     */
/* Each item describes how the service is conducted. None asserts an award,   */
/* licence, certification or statistic. Credentials live in `business` above  */
/* and stay behind the verification guard.                                    */
/* -------------------------------------------------------------------------- */

export const trustStrip = [
  'Private Appointments',
  'Transparent Evaluation',
  'Professional Weighing',
  'Confidential Service',
] as const;

/* -------------------------------------------------------------------------- */
/* INSIGHTS — topics planned; article bodies are not written yet              */
/* -------------------------------------------------------------------------- */

export const insightTopics = [
  { title: 'How Gold Purity Is Measured', category: 'Fundamentals' },
  { title: 'Understanding Gold Hallmarks', category: 'Fundamentals' },
  { title: 'What Affects the Value of Gold?', category: 'Valuation' },
  { title: 'Bullion Versus Jewellery Valuation', category: 'Valuation' },
  { title: 'How to Prepare Gold for an Evaluation', category: 'Practical' },
  { title: 'Understanding Gold Weight Measurements', category: 'Fundamentals' },
  { title: 'What to Bring to a Private Valuation', category: 'Practical' },
  { title: 'Common Gold Valuation Questions', category: 'Practical' },
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
export function buildLocalBusinessJsonLd(): Record<string, unknown> | null {
  const address = verifiedValue(business.address);
  const legalName = verifiedValue(business.legalName);

  if (!address || !legalName) return null;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: brand.name,
    legalName,
    url: brand.url,
    address,
  };

  const telephone = verifiedValue(business.telephone);
  if (telephone) jsonLd.telephone = telephone;

  const email = verifiedValue(business.email);
  if (email) jsonLd.email = email;

  const hours = verifiedValue(business.openingHours);
  if (hours) jsonLd.openingHours = hours;

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
const TRAILING_SLASH = process.env.GITHUB_PAGES === 'true';

export function canonicalPath(path: string): string {
  if (path === '/') return '/';
  const clean = path.replace(/\/+$/, '');
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
    type: 'website' as const,
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
    images: ['/opengraph-image'],
  };
}

/** Every outstanding placeholder, for the build-time content report. */
export function outstandingPlaceholders(): string[] {
  return Object.entries(business)
    .filter(([, field]) => (field as Verifiable<unknown>).status === 'placeholder')
    .map(([key, field]) => `${key}: ${(field as { label: string }).label}`);
}
