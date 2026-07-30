# Content Placeholders — What Must Be Supplied Before Launch

Every item below renders on the live site as a **visible marked slot**, not as
invented copy. Nothing in this build states a business fact that has not been
verified.

That is enforced in code, not by discipline: unverified fields are typed as
`Verifiable<T>` in [`src/lib/site.ts`](src/lib/site.ts) and can only reach the
page through the `<Fact>` component, which renders a placeholder chip when the
field's status is `placeholder`. There is no code path that prints an
unconfirmed value as fact.

---

## 1. Brand assets — **highest priority**

| Item | Status | Where it is used |
| --- | --- | --- |
| **The Pureweight logo file** | ✅ Supplied, in use | Loader, nav, footer, brand story |
| **A vector (SVG) logo** | ⚠️ **Still wanted** | Everywhere the above is used |
| **The hero brand film** | ✅ Supplied, partially usable — see §3 | Homepage hero |

The supplied logo is live at
[`public/brand/pureweight-logo.webp`](public/brand/pureweight-logo.webp) and is
cropped into its three roles by
[`src/components/brand/Logo.tsx`](src/components/brand/Logo.tsx).

**It is a 256-colour indexed raster, not a vector.** That is visible: the gold
gradients band, and the filigree softens at small sizes and in the loader's
wipe. An SVG would fix both and is the one brand asset still outstanding.

Also still holding a placeholder mark:
[`src/app/icon.svg`](src/app/icon.svg) — replace with the real monogram.

---

## 1b. The hero brand film — four claims to confirm

The supplied animation is the homepage hero, but **only its first 4.55 seconds
ship**. The rest asserts things about the business that nothing on file supports,
so it was cut. Confirming any of the following releases more of the clip:

| # | What the film asserts | Confirm this | If confirmed |
| --- | --- | --- | --- |
| 1 | A bar struck **`999.9 FINE GOLD` / `1 KILO GOLD`** | That Pureweight handles kilo bars at that fineness | ~1.5 s of bullion footage becomes usable |
| 2 | Stacks of **US dollar bills** | The settlement currency, and that cash settlement is offered at all | ~1 s becomes usable — but the brief also directs away from literal cash imagery, so this is an art-direction decision as well as a factual one |
| 3 | The **`®`** on `PUREWEIGHT` | That the mark is **registered**, and in which jurisdiction | The lockup becomes usable. An unregistered `®` is a misrepresentation in many jurisdictions, which is why this is not a styling question |
| 4 | A **`CALL TO NOW`** button | The telephone number (see §2, `telephone`) | Nothing. This stays cut regardless: the wording is not English, it duplicates the page's real CTAs, and baked-in raster text cannot be read by a screen reader, resized, or translated |

Cutting the film is a one-command job once these are answered — see
[`media/masters/README.md`](media/masters/README.md).

**After any re-cut, the hero contrast gate must be re-run.** The film's specular
highlights are brighter than the ivory text laid over them, and a different cut
can break WCAG AA without any visible warning. The command is in the same file.

---

## 2. Business facts

All in [`src/lib/site.ts`](src/lib/site.ts) under `business`. Change
`pending('…')` to `{ status: 'verified', value: '…' }`.

| Field | Placeholder shown |
| --- | --- |
| `legalName` | `[INSERT REGISTERED LEGAL NAME]` |
| `registrationNumber` | `[INSERT VERIFIED BUSINESS REGISTRATION NUMBER]` |
| `vatNumber` | `[INSERT VAT / TAX NUMBER, IF APPLICABLE]` |
| `yearEstablished` | `[INSERT CONFIRMED YEAR ESTABLISHED]` |
| `address` | `[INSERT CONFIRMED TRADING ADDRESS]` |
| `serviceArea` | `[INSERT CONFIRMED SERVICE AREA]` |
| `telephone` | `[INSERT VERIFIED TELEPHONE NUMBER]` |
| `email` | `[INSERT VERIFIED ENQUIRY EMAIL ADDRESS]` |
| `openingHours` | `[INSERT CONFIRMED OPENING HOURS]` |
| `appointmentProcess` | `[INSERT VERIFIED APPOINTMENT PROCESS]` |
| `settlementMethods` | `[INSERT CONFIRMED SETTLEMENT / PAYMENT METHODS]` |
| `priceReferenceSource` | `[INSERT APPROVED GOLD-PRICE REFERENCE SOURCE]` |
| `insurance` | `[INSERT VERIFIED INSURANCE DETAILS]` |
| `memberships` | `[INSERT VERIFIED PROFESSIONAL MEMBERSHIPS]` |
| `certifications` | `[INSERT VERIFIED CERTIFICATIONS]` |
| `licences` | `[INSERT VERIFIED LICENCES]` |
| `securityProcedures` | `[INSERT CONFIRMED SECURITY PROCEDURES]` |
| `weighingEquipment` | `[INSERT CONFIRMED WEIGHING / ASSAY EQUIPMENT]` |
| `reviewScore` | `[INSERT GENUINE AGGREGATE REVIEW SCORE + SOURCE]` |
| `founderMessage` | `[INSERT FOUNDER MESSAGE]` |
| `foundingStory` | `[INSERT VERIFIED FOUNDING STORY]` |
| `social` | `[INSERT CONFIRMED SOCIAL CHANNELS]` |

> **Structured data.** `LocalBusiness` JSON-LD is emitted **only** once
> `legalName` and `address` are both verified. Until then the page ships no
> structured data at all — publishing markup containing `[INSERT ADDRESS]` to a
> search engine is worse than publishing none.

---

## 3. Services

In `site.ts` under `services`. Each carries `confirmed: false` and renders with a
visible *"Placeholder — pending client confirmation"* marker.

Confirm which of these the business actually offers, then set `confirmed: true`
(and delete any it does not):

- Gold Valuation
- Bullion Exchange
- Jewellery Evaluation
- Private Appointments

Other candidates named in the brief, not currently built: Gold Buying, Gold
Selling, Precious-Metal Assessment, Commercial Gold Services.

**On the service CTAs.** The brief suggested "Explore Gold Valuation" style
labels pointing at per-service pages. Those pages cannot be written while the
services themselves are unconfirmed, and a CTA reading *Explore* that lands on
an enquiry form promises a page that does not exist. So each CTA now says what
it does — *"Enquire About Bullion Exchange"* — and carries the item type into
the form via `enquiryHref`, so step one arrives already answered.

Once services are confirmed and per-service pages are written, point
`enquiryHref` at those pages and restore the *Explore* wording.

---

## 4. Appointment types

In [`src/lib/valuation-schema.ts`](src/lib/valuation-schema.ts) under
`APPOINTMENT_TYPES`. In-person, telephone and video are all marked
`confirmed: false` and render with a *pending* tag in the form.

Confirm which are genuinely offered and set `confirmed: true`. Remove any that
are not — offering a video consultation the business does not provide is a
promise made on their behalf.

---

## 4b. FAQ — business-specific answers

[`src/app/faq/page.tsx`](src/app/faq/page.tsx) is split in two on purpose.

Six **general** questions are answered in full (carat as a fraction of 24, the
troy ounce at 31.1035g, hallmarks, why attached material reduces recoverable
weight, cleaning before a visit, why phone valuations are not given). These are
trade-standard facts, independently checkable, and they carry the page's
`FAQPage` structured data.

Six **business-specific** questions render as marked slots, because each is a
promise made on the client's behalf:

| Question | Placeholder |
| --- | --- |
| What identification do I need to bring? | `[INSERT CONFIRMED IDENTIFICATION REQUIREMENTS]` |
| How is payment made, and when? | `[INSERT CONFIRMED SETTLEMENT / PAYMENT METHODS]` |
| Is there a charge for a valuation? | `[INSERT CONFIRMED VALUATION FEE POLICY]` |
| How long does an assessment take? | `[INSERT CONFIRMED ASSESSMENT TIMEFRAME]` |
| Are my items insured while with you? | `[INSERT VERIFIED INSURANCE DETAILS]` |
| Do I have to sell if I do not like the figure? | `[INSERT CONFIRMED NO-OBLIGATION POLICY]` |

> Structured data is generated from the answered questions **only**. A
> placeholder must never be marked up as an accepted answer — that would publish
> `[INSERT CONFIRMED PAYMENT METHOD]` as this business's stated policy in a
> search result.

---

## 5. Testimonials

[`src/components/sections/Testimonials.tsx`](src/components/sections/Testimonials.tsx)
exports an **empty** `testimonials` array. The section renders complete
typography, manual controls and live-region announcements around a marked slot.

Add client-approved quotes in the shape `{ quote, name, context }`. **Do not
write these.** They are evidence about a real business.

---

## 6. Insights articles

Eight topics are planned in `site.ts` (`insightTopics`); none are written. The
index at `/insights` is `noindex` until they are.

The three short explainers already on `/insights` (carat as a fraction of 24,
the troy ounce at 31.1035g, what attached material does to recoverable weight)
are trade-standard definitions, not business claims, and are safe to keep.

---

## 7. Legal documents

`/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/accessibility` ship
as **structured shells**, each section naming exactly what it must contain. All
are `noindex` and none is represented as being in force.

These must be written by the client's legal adviser. A privacy policy is a
binding statement about what a specific company does with specific data, naming
specific processors — generating a plausible one produces a document that reads
correctly and describes practices nobody has checked.

---

## 8. Photography

The service panels use engraved ornamental plates drawn from the emblem's
vocabulary rather than stock imagery. They are on-brand and honest, but real
macro photography would be better.

The layout in [`Services.tsx`](src/components/sections/Services.tsx) is built to
take a **4:5** image in place of `<ServicePlate />` with no other changes.

Suggested shots: a piece being positioned on the scale pan; bullion under raking
light; a hallmark under magnification; the consultation room, unoccupied.

---

## 9. Not built, deliberately

| Requested | Why not |
| --- | --- |
| **Live gold rates** | No approved data source, refresh rate or currency confirmed. |
| **Valuation calculator** | Needs the exact calculation method, supported metals, deductions, data source and terms. Guessing any of them and putting a number on screen would be issuing a quotation. |
| **Trust badges** | A trust badge nobody issued is a forgery with rounded corners. Replaced by the checkable evidence ledger. |
| **Founding story / heritage** | Not supplied. Inventing a founding date for a business that handles other people's valuables is a false claim about a real company. |
| **Turnaround times, fees, guarantees** | None confirmed. |
