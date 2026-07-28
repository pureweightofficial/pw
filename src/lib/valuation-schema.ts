import { z } from 'zod';

/**
 * VALUATION ENQUIRY — SHARED SCHEMA
 *
 * One schema, imported by both the form and the route handler. Client-side
 * validation is a courtesy that makes the form pleasant; server-side validation
 * is the one that counts, and running the identical rules in both places means
 * they cannot drift apart.
 *
 * The optional fields are optional on purpose. Someone clearing a late
 * relative's jewellery box does not know the weight, does not know the carat,
 * and will abandon a form that insists. Name, email and consent are the only
 * things genuinely required to start a conversation.
 */

export const ITEM_TYPES = [
  { value: 'bullion', label: 'Gold bullion', hint: 'Bars or investment coins' },
  { value: 'jewellery', label: 'Gold jewellery', hint: 'Worn, inherited or broken' },
  { value: 'coins', label: 'Coins', hint: 'Collectable or sovereign' },
  { value: 'scrap', label: 'Scrap gold', hint: 'Odd pieces, single earrings, offcuts' },
  { value: 'other', label: 'Other precious metal', hint: 'Silver, platinum or mixed' },
  { value: 'unsure', label: 'Not sure', hint: 'We will help identify it' },
] as const;

export const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'worn', label: 'Worn' },
  { value: 'damaged', label: 'Damaged or broken' },
  { value: 'unknown', label: 'Not sure' },
] as const;

export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telephone' },
  { value: 'either', label: 'Either' },
] as const;

/**
 * Appointment types.
 *
 * `confirmed: false` on every entry until the client states which of these they
 * actually offer. Unconfirmed options render with a visible marker rather than
 * being presented as available — offering a video consultation a business does
 * not provide is a promise made on their behalf.
 */
export const APPOINTMENT_TYPES = [
  { value: 'in-person', label: 'In person', hint: 'At the premises', confirmed: false },
  { value: 'telephone', label: 'Telephone', hint: 'A call at an agreed time', confirmed: false },
  { value: 'video', label: 'Video consultation', hint: 'By video call', confirmed: false },
  { value: 'unsure', label: 'No preference', hint: 'Whichever suits', confirmed: true },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((item) => item.value) as [string, ...string[]];

/* -------------------------------------------------------------------------- */
/* UPLOADS                                                                    */
/* -------------------------------------------------------------------------- */

export const UPLOAD_LIMITS = {
  maxFiles: 5,
  maxBytesPerFile: 8 * 1024 * 1024, // 8 MB
  maxTotalBytes: 24 * 1024 * 1024,
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  acceptLabel: 'JPG, PNG, WEBP or HEIC',
} as const;

export function describeFileError(file: { type: string; size: number; name: string }): string | null {
  if (!UPLOAD_LIMITS.accept.includes(file.type as (typeof UPLOAD_LIMITS.accept)[number])) {
    return `“${file.name}” is not a supported image. Please use ${UPLOAD_LIMITS.acceptLabel}.`;
  }
  if (file.size > UPLOAD_LIMITS.maxBytesPerFile) {
    return `“${file.name}” is larger than 8 MB. Please attach a smaller image.`;
  }
  if (file.size === 0) {
    return `“${file.name}” appears to be empty.`;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* SCHEMA                                                                     */
/* -------------------------------------------------------------------------- */

const valuationBase = z.object({
  /* Step 1 — item type */
  itemType: z.enum(values(ITEM_TYPES), {
    errorMap: () => ({ message: 'Please choose the type of item you would like assessed.' }),
  }),

  /* Step 2 — what is known */
  approxWeight: z.string().trim().max(60, 'Please keep this under 60 characters.').optional(),
  purity: z.string().trim().max(60, 'Please keep this under 60 characters.').optional(),
  quantity: z.string().trim().max(60, 'Please keep this under 60 characters.').optional(),
  condition: z.enum(values(CONDITIONS)).optional(),
  notes: z.string().trim().max(2000, 'Please keep your notes under 2,000 characters.').optional(),

  /* Step 4 — contact */
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter your name.')
    .max(120, 'Please keep your name under 120 characters.'),
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email address, for example name@example.com.'),
  phone: z
    .string()
    .trim()
    .max(40, 'Please keep your number under 40 characters.')
    // Permissive on purpose: international formats, spaces, brackets and
    // extensions are all normal, and a strict pattern rejects real numbers.
    .regex(/^[\d\s()+\-.extEXT]*$/, 'Please enter a valid telephone number.')
    .optional()
    .or(z.literal('')),
  preferredContact: z.enum(values(CONTACT_METHODS)),

  /* Step 5 — appointment */
  appointmentType: z.enum(values(APPOINTMENT_TYPES)),

  /* Step 6 — consent */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you are happy for us to contact you.' }),
  }),
});

/**
 * Cross-field rules.
 *
 * Asking to be telephoned without leaving a number is the one combination this
 * form can produce that guarantees the enquiry goes nowhere. The visitor
 * believes they are waiting for a call; the business has no way to make it.
 * Caught here rather than in the UI so the server enforces it too.
 */
const crossFieldChecks = (
  data: { preferredContact: string; phone?: string },
  ctx: z.RefinementCtx,
) => {
  if (data.preferredContact === 'phone' && !data.phone?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone'],
      message: 'Please add a telephone number, or choose email as your preferred contact.',
    });
  }
};

export const valuationSchema = valuationBase.superRefine(crossFieldChecks);

export type ValuationInput = z.infer<typeof valuationBase>;

/** Server-only additions: the spam controls, which never reach the UI. */
export const valuationServerSchema = valuationBase
  .extend({
    /**
     * Honeypot. A hidden field no human sees or fills. Bots complete every
     * input they find, so a non-empty value here is a very high-confidence bot
     * signal — and unlike a CAPTCHA it costs a real visitor nothing at all.
     */
    website: z.string().max(0, 'Rejected.').optional().or(z.literal('')),
    /**
     * Time from form mount to submit. Humans take at least a few seconds to
     * read six steps; scripted posts arrive almost instantly.
     */
    elapsedMs: z.coerce.number().min(3000, 'Rejected.'),
  })
  // The same cross-field rules the client applies. Client validation is a
  // courtesy; this is the one that counts.
  .superRefine(crossFieldChecks);

/* -------------------------------------------------------------------------- */
/* STEPS                                                                      */
/* -------------------------------------------------------------------------- */

export const STEPS = [
  { id: 'item', title: 'Item Type', legend: 'What would you like assessed?' },
  { id: 'details', title: 'Details', legend: 'What do you already know about it?' },
  { id: 'images', title: 'Images', legend: 'Add photographs, if you have them' },
  { id: 'contact', title: 'Contact', legend: 'How can we reach you?' },
  { id: 'appointment', title: 'Appointment', legend: 'How would you prefer to speak?' },
  { id: 'review', title: 'Review', legend: 'Check your enquiry before sending' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

/** Which fields each step is responsible for, so steps validate in isolation. */
export const STEP_FIELDS: Record<StepId, (keyof ValuationInput)[]> = {
  item: ['itemType'],
  details: ['approxWeight', 'purity', 'quantity', 'condition', 'notes'],
  images: [],
  contact: ['fullName', 'email', 'phone', 'preferredContact'],
  appointment: ['appointmentType'],
  review: ['consent'],
};
