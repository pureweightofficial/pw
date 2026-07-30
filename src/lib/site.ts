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
  positioning: 'We buy gold and silver, weighed and valued in front of you.',
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
  { label: 'Live Prices', href: '/#rates' },
  { label: 'What We Buy', href: '/#services' },
  { label: 'How It Works', href: '/#journey' },
  { label: 'Purity & Weight', href: '/#assay' },
  { label: 'About', href: '/#story' },
  { label: 'Insights', href: '/insights' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
] as const;

/**
 * The nav's single action. Points at the shop rather than at a form: this trade
 * happens over the counter, so the useful thing to offer is the address and the
 * hours. See VisitCta for why the label is not "Call us" — the number is still an
 * unconfirmed fact and must not be implied here.
 */
export const navCta = {
  label: 'Visit the Shop',
  href: '/contact',
} as const;

/* -------------------------------------------------------------------------- */
/* CHAPTERS — the scroll spine                                                */
/* -------------------------------------------------------------------------- */

export const chapters = [
  { id: 'trust', index: '01', title: 'True Value' },
  { id: 'journey', index: '02', title: 'How It Works' },
  { id: 'services', index: '03', title: 'What We Buy' },
  { id: 'assay', index: '04', title: 'Purity & Weight' },
  { id: 'pillars', index: '05', title: 'Built on Trust' },
  { id: 'appointment', index: '06', title: 'Come and See Us' },
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
    step: '01',
    title: 'Bring It In',
    body: 'Come to the shop with whatever you have — jewellery, coins, bars, or a drawer of odds and ends.',
    detail:
      'Nothing needs sorting, cleaning or valuing beforehand. Broken chains, single earrings and pieces with the stones still in them are all perfectly normal, and there is no minimum worth bringing.',
    tilt: -2.4,
  },
  {
    step: '02',
    title: 'Weighed In Front of You',
    body: 'Each item is examined and weighed at the counter while you watch, not taken away.',
    detail:
      'Hallmarks are read under magnification, and where a mark is worn or absent the metal is tested rather than assumed. The scale stays where you can see it and the weight is read out as it is taken.',
    tilt: -1.4,
  },
  {
    step: '03',
    title: 'An Offer Against the Market',
    body: 'You are told what the metal weighs, how pure it is, and what we can pay for it.',
    detail:
      'Precious metal prices move through the trading day, so the figure relates to the market at that moment. How it is arrived at is shown rather than summarised — weight, fineness, and the market reference it is measured against.',
    tilt: -0.5,
  },
  {
    step: '04',
    title: 'Accept, or Take It Home',
    body: 'If the figure suits you the sale completes there and then. If it does not, your items go back in your pocket.',
    detail:
      'There is no obligation at any point and no charge for having looked. Declining is an ordinary outcome and is treated as one.',
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
export const services: readonly Service[] = [
  {
    index: '01',
    title: 'Gold Jewellery',
    summary: 'Worn, broken, inherited or unwanted — in any condition.',
    body: 'Chains, rings, bracelets, earrings and pendants, whether whole or in pieces. Nothing needs to be a matching pair, in working order, or worth anything in particular before it is worth bringing in.',
    points: ['Any carat, 9ct to 24ct', 'Broken and single pieces', 'Stones and settings allowed for'],
    cta: 'Bring Jewellery In',
    image: '/img/jewellery.jpg',
    enquiryHref: '/contact',
    confirmed: true,
  },
  {
    index: '02',
    title: 'Silver',
    summary: 'Hallmarked silver, from jewellery to tableware.',
    body: 'Silver is weighed and assessed on the same basis as gold, against its own market price. Plated items contain very little recoverable silver, and we will tell you plainly when that is what you have.',
    points: ['Sterling and 800 silver', 'Jewellery, cutlery, tableware', 'Plate identified honestly'],
    cta: 'Bring Silver In',
    enquiryHref: '/contact',
    confirmed: true,
  },
  {
    index: '03',
    title: 'Coins',
    summary: 'Precious-metal coins, whether collected or inherited.',
    body: 'Coins are looked at twice: once for the metal in them, and once for whether the coin itself is worth more than that metal. Where the second is true you are told so, rather than paid for the weight.',
    points: ['Sovereigns and krugerrands', 'Pre-decimal silver', 'Collections and single coins'],
    cta: 'Bring Coins In',
    enquiryHref: '/contact',
    confirmed: true,
  },
  {
    index: '04',
    title: 'Bars & Bullion',
    summary: 'Investment bars and coins, assessed on weight and stated fineness.',
    body: 'Refiner marks and stated fineness are checked against the physical weight of the piece. Recognised bullion is handled on its own terms rather than treated as scrap metal.',
    points: ['Refiner mark checked', 'Weight verified at the counter', 'Bars and investment coins'],
    cta: 'Bring Bullion In',
    image: '/img/bullion.jpg',
    enquiryHref: '/contact',
    confirmed: true,
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
    title: 'Weighed in front of you',
    body: 'The scale stays where you can see it and the weight is read out as it is taken. Nothing is carried into a back room.',
  },
  {
    title: 'Measured against the market',
    body: 'Precious metal has a published market price. Any figure is related back to it, at the moment you are standing there.',
  },
  {
    title: 'The working is shown',
    body: 'Weight, the purity we have established, and how the two produce the figure — explained before you are asked to decide anything.',
  },
  {
    title: 'No obligation, ever',
    body: 'Having something examined and valued costs nothing. Taking it home again is an ordinary outcome, not an awkward one.',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* TRUST STRIP — service characteristics, not credentials                     */
/* Each item describes how the service is conducted. None asserts an award,   */
/* licence, certification or statistic. Credentials live in `business` above  */
/* and stay behind the verification guard.                                    */
/* -------------------------------------------------------------------------- */

export const trustStrip = [
  'Weighed at the Counter',
  'Market-Referenced Figures',
  'Gold, Silver, Coins, Bullion',
  'No Obligation to Sell',
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
